import { randomUUID } from 'node:crypto';
import { openProjectDatabase } from '../project/project-service.js';
import { getRunDetail } from '../experiment/run-repository.js';
import { evaluateCandidate } from './matching.js';

const stamp = () => new Date().toISOString();

function json(value) { return value ? JSON.parse(value) : null; }

function loadClaim(db, claimId) {
  const row = db.prepare(`SELECT c.*, d.path AS document_path, d.content_hash AS document_hash
    FROM claims c JOIN documents d ON d.id = c.document_id WHERE c.id = ?`).get(claimId);
  if (!row) throw new Error(`Claim not found: ${claimId}`);
  return { id: row.id, documentId: row.document_id, documentPath: row.document_path,
    documentHash: row.document_hash, type: row.claim_type, originalText: row.original_text,
    normalized: json(row.normalized_json), sourceLocation: json(row.source_location_json), status: row.status };
}

function loadRuns(db, projectId, options) {
  const nodes = db.prepare('SELECT * FROM worktree_nodes WHERE project_id = ?').all(projectId);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const rows = db.prepare(`SELECT n.id, n.name, d.execution_status, d.metrics_json, d.config_json,
    d.dataset_json, d.seed, d.git_commit, d.git_dirty, d.git_diff_hash
    FROM worktree_nodes n JOIN run_details d ON d.node_id = n.id
    WHERE n.project_id = ? AND d.execution_status = 'succeeded' ORDER BY n.created_at DESC LIMIT 5000`)
    .all(projectId);
  return rows.flatMap((row) => {
    const lineage = [];
    let cursor = byId.get(row.id);
    const seen = new Set();
    let hidden = false;
    while (cursor) {
      if (seen.has(cursor.id)) throw new Error('Research tree contains a cycle');
      seen.add(cursor.id);
      if (cursor.status === 'archived' && !options.includeArchived) hidden = true;
      if (cursor.status === 'rejected' && !options.includeRejected) hidden = true;
      lineage.unshift({ id: cursor.id, name: cursor.name, type: cursor.type, status: cursor.status });
      cursor = cursor.parent_id ? byId.get(cursor.parent_id) : null;
    }
    if (hidden) return [];
    const config = json(row.config_json);
    const methodNames = lineage.filter((node) => node.type === 'method').map((node) => node.name);
    if (typeof config?.method === 'string') methodNames.push(config.method);
    for (const node of lineage.filter((item) => item.type === 'method')) {
      const raw = byId.get(node.id)?.tags_json;
      if (raw) methodNames.push(...JSON.parse(raw));
    }
    methodNames.push(row.name);
    return [{ id: row.id, name: row.name, lineage, methodNames, status: row.execution_status,
      metrics: json(row.metrics_json), config, dataset: json(row.dataset_json), seed: row.seed,
      git: { commit: row.git_commit, dirty: row.git_dirty === null ? null : Boolean(row.git_dirty),
        diffHash: row.git_diff_hash } }];
  });
}

function linksFor(db, claimId) {
  return db.prepare(`SELECT id, run_node_id AS runId, status, confidence, reasons_json AS reasonsJson,
    created_at AS createdAt FROM claim_run_links WHERE claim_id = ? ORDER BY status, created_at`)
    .all(claimId).map(({ reasonsJson, ...row }) => ({ ...row, reasons: JSON.parse(reasonsJson) }));
}

function chain(root, claim, runId) {
  const run = getRunDetail(root, runId);
  if (!run) return null;
  return { paper: { documentId: claim.documentId, path: claim.documentPath,
    contentHash: claim.documentHash, claimId: claim.id, quote: claim.originalText,
    location: claim.sourceLocation },
  result: { metric: claim.normalized.metric ?? null,
    claimedValue: claim.normalized.target_value ?? claim.normalized.mean ?? null,
    recordedValue: claim.normalized.metric ? Object.entries(run.metrics ?? {}).find(([name]) =>
      name.toLowerCase() === claim.normalized.metric.toLowerCase())?.[1] ?? null : null,
    metrics: run.metrics },
  run: { id: run.id, name: run.name, status: run.status, command: run.command,
    snapshotManifestPath: run.snapshotManifestPath },
  config: run.config, git: run.git, dataset: run.dataset, assets: run.assets };
}

function upsertCandidates(db, claimId, candidates, confirmedId) {
  const existing = new Map(linksFor(db, claimId).map((link) => [link.runId, link]));
  const ids = new Set(candidates.map((candidate) => candidate.runId));
  for (const link of existing.values()) {
    if (link.status !== 'confirmed' && !ids.has(link.runId)) {
      db.prepare('DELETE FROM claim_run_links WHERE id = ?').run(link.id);
    }
  }
  for (const candidate of candidates) {
    const status = candidate.runId === confirmedId ? 'confirmed' : 'candidate';
    const confidence = Math.max(0, Math.min(1, candidate.score / 115));
    const reasons = JSON.stringify([...candidate.reasons, ...candidate.contradictions]);
    db.prepare(`INSERT INTO claim_run_links (id, claim_id, run_node_id, status, confidence, reasons_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(claim_id, run_node_id)
      DO UPDATE SET status = excluded.status, confidence = excluded.confidence,
      reasons_json = excluded.reasons_json`).run(randomUUID(), claimId, candidate.runId,
      status, confidence, reasons, stamp());
  }
}

export async function traceClaim(rootPath, claimId, options = {}) {
  if (typeof claimId !== 'string' || !claimId) throw new Error('Claim id is required');
  if (options.tolerance != null && (!Number.isFinite(options.tolerance) || options.tolerance < 0 || options.tolerance > 1)) {
    throw new Error('Tolerance must be between 0 and 1');
  }
  const { db, root, project } = openProjectDatabase(rootPath);
  try {
    const claim = loadClaim(db, claimId);
    const runs = loadRuns(db, project.id, options);
    let candidates = runs.map((run) => evaluateCandidate(claim, run, options)).filter(Boolean)
      .sort((a, b) => b.score - a.score || a.runId.localeCompare(b.runId));
    if (options.semanticRanker && candidates.length &&
        !candidates.some((candidate) => candidate.methodMatch) &&
        (claim.normalized.target_method || claim.normalized.method || claim.normalized.parameters?.[0]?.scope)) {
      const rankings = await options.semanticRanker(claim, candidates.slice(0, 20));
      const byId = new Map(rankings.map((item) => [item.runId, item]));
      candidates = candidates.map((candidate) => {
        const rank = byId.get(candidate.runId);
        if (!rank || !Number.isFinite(rank.similarity)) return candidate;
        const boost = Math.max(0, Math.min(1, rank.similarity)) * 12;
        return { ...candidate, score: candidate.score + boost,
          reasons: [...candidate.reasons, `semantic method similarity ${rank.similarity.toFixed(2)}: ${rank.reason}`] };
      }).sort((a, b) => b.score - a.score || a.runId.localeCompare(b.runId));
    }
    const best = candidates[0];
    const second = candidates[1];
    const existing = linksFor(db, claimId).find((link) => link.status === 'confirmed');
    const existingVisible = existing && candidates.some((candidate) => candidate.runId === existing.runId);
    const autoConfirm = !existing && best && (!second || best.score - second.score >= 15) &&
      (best.numeric?.kind === 'exact' || best.numeric?.kind === 'rounded' ||
        (best.methodMatch && best.score >= 28 && !best.contradictions.length));
    const confirmedId = existing?.runId ?? (autoConfirm ? best.runId : null);
    let status = confirmedId ? 'matched' : candidates.length > 1 &&
      (!second || best.score - second.score < 15) ? 'ambiguous' :
      best?.contradictions.length ? 'conflict' : best ? 'insufficient_evidence' : 'unmatched';
    if (existing && !existingVisible) status = 'insufficient_evidence';
    db.exec('BEGIN IMMEDIATE');
    try {
      upsertCandidates(db, claimId, candidates.slice(0, 20), confirmedId);
      db.prepare('UPDATE claims SET status = ?, updated_at = ? WHERE id = ?').run(status, stamp(), claimId);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return { claim: { ...claim, status }, candidates: candidates.slice(0, 20),
      confirmedRunId: confirmedId, confirmedExcludedByDefault: Boolean(existing && !existingVisible),
      links: linksFor(db, claimId), evidenceChain: confirmedId ? chain(root, claim, confirmedId) : null };
  } finally { db.close(); }
}

export function confirmClaimLink(rootPath, claimId, runId, options = {}) {
  const { db, root, project } = openProjectDatabase(rootPath);
  try {
    const claim = loadClaim(db, claimId);
    const allowed = new Set(loadRuns(db, project.id, options).map((run) => run.id));
    if (!allowed.has(runId)) throw new Error('Run is not an eligible current candidate');
    const link = db.prepare(`SELECT id FROM claim_run_links WHERE claim_id = ? AND run_node_id = ?
      AND status IN ('candidate', 'confirmed')`).get(claimId, runId);
    if (!link) throw new Error('Run must be traced as a candidate before confirmation');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`UPDATE claim_run_links SET status = 'candidate' WHERE claim_id = ? AND status = 'confirmed'`)
        .run(claimId);
      db.prepare(`UPDATE claim_run_links SET status = 'confirmed' WHERE id = ?`).run(link.id);
      db.prepare(`UPDATE claims SET status = 'matched', updated_at = ? WHERE id = ?`)
        .run(stamp(), claimId);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return { claim: { ...claim, status: 'matched' }, confirmedRunId: runId,
      links: linksFor(db, claimId), evidenceChain: chain(root, claim, runId) };
  } finally { db.close(); }
}

export function getClaimTrace(rootPath, claimId) {
  const { db, root } = openProjectDatabase(rootPath);
  try {
    const claim = loadClaim(db, claimId);
    const links = linksFor(db, claimId);
    const confirmedRunId = links.find((link) => link.status === 'confirmed')?.runId ?? null;
    return { claim, links, confirmedRunId,
      evidenceChain: confirmedRunId ? chain(root, claim, confirmedRunId) : null };
  } finally { db.close(); }
}
