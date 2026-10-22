import { randomUUID } from 'node:crypto';
import { openProjectDatabase } from '../project/project-service.js';
import { getTree } from '../tree/tree-service.js';

const TYPES = new Set(['continue', 'pause', 'reject', 'archive', 'promote_to_primary', 'reopen']);
const STATUS = { continue: 'active', pause: 'paused', reject: 'rejected', archive: 'archived',
  reopen: 'active' };
const now = () => new Date().toISOString();

function text(value, label, max = 5000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${label} must be non-empty text under ${max} characters`);
  }
  return value.trim();
}

function optionalText(value, label) {
  return value == null || value === '' ? null : text(value, label);
}

function runEvidence(db, projectId, ids) {
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== 'string')) {
    throw new Error('relatedRunIds must be an array of run ids');
  }
  const unique = [...new Set(ids)];
  return unique.map((id) => {
    const row = db.prepare(`SELECT n.id, n.name, d.execution_status AS status, d.metrics_json AS metricsJson,
      d.config_json AS configJson FROM worktree_nodes n JOIN run_details d ON d.node_id = n.id
      WHERE n.project_id = ? AND n.id = ?`).get(projectId, id);
    if (!row) throw new Error(`Related run not found: ${id}`);
    return { id: row.id, name: row.name, status: row.status,
      metrics: row.metricsJson ? JSON.parse(row.metricsJson) : null,
      config: row.configJson ? JSON.parse(row.configJson) : null };
  });
}

function groundedSummary(summary, rawText, runs) {
  const evidence = `${rawText} ${runs.map((run) =>
    `${JSON.stringify(run.metrics ?? {})} ${JSON.stringify(run.config ?? {})}`).join(' ')}`;
  const standaloneNumbers = /(?<![\p{L}\p{N}_])\d+(?:\.\d+)?(?![\p{L}\p{N}_])/gu;
  const supported = new Set(evidence.match(standaloneNumbers) ?? []);
  const numbers = summary.match(standaloneNumbers) ?? [];
  for (const number of numbers) {
    if (!supported.has(number)) throw new Error(`Decision summary has unsupported numeric value: ${number}`);
  }
  return summary;
}

function materialize(row, runs = []) {
  return { id: row.id, nodeId: row.node_id, type: row.decision_type,
    rawUserText: row.raw_user_text, summary: row.summary, reason: row.reason,
    alternativeRoute: row.alternative_route, reopenCondition: row.reopen_condition,
    relatedRunIds: JSON.parse(row.related_run_ids_json), relatedRuns: runs, createdAt: row.created_at };
}

export function recordDecision(rootPath, input) {
  const type = input?.type;
  if (!TYPES.has(type)) throw new Error(`Invalid decision type: ${type}`);
  const raw = text(input.rawUserText, 'Original user statement');
  const summary = text(input.summary ?? raw, 'Decision summary');
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const node = db.prepare(`SELECT id, type, parent_id, status FROM worktree_nodes
      WHERE project_id = ? AND id = ?`).get(project.id, input.nodeId);
    if (!node || node.type === 'research_question') {
      throw new Error('Decision must target a method, experiment group, or run');
    }
    const runs = runEvidence(db, project.id, input.relatedRunIds ?? []);
    groundedSummary(summary, raw, runs);
    const id = randomUUID();
    const time = now();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`INSERT INTO decisions (id, node_id, decision_type, raw_user_text, summary,
        reason, alternative_route, reopen_condition, related_run_ids_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, node.id, type, raw, summary,
        optionalText(input.reason, 'Reason'), optionalText(input.alternativeRoute, 'Alternative route'),
        optionalText(input.reopenCondition, 'Reopen condition'), JSON.stringify(runs.map((run) => run.id)), time);
      if (STATUS[type]) db.prepare(`UPDATE worktree_nodes SET status = ?, archived_at = ?,
        is_primary = CASE WHEN ? IN ('rejected', 'archived') THEN 0 ELSE is_primary END,
        summary = ?, updated_at = ? WHERE id = ?`).run(STATUS[type], type === 'archive' ? time : null,
        STATUS[type], summary, time, node.id);
      if (type === 'promote_to_primary') {
        if (node.type !== 'method' || ['archived', 'rejected'].includes(node.status)) {
          throw new Error('Only a current method may be promoted to primary');
        }
        let ancestor = node.parent_id ? db.prepare('SELECT id, parent_id, status FROM worktree_nodes WHERE id = ?')
          .get(node.parent_id) : null;
        while (ancestor) {
          if (['archived', 'rejected'].includes(ancestor.status)) {
            throw new Error('Methods under archived or rejected routes cannot be primary');
          }
          ancestor = ancestor.parent_id ? db.prepare('SELECT id, parent_id, status FROM worktree_nodes WHERE id = ?')
            .get(ancestor.parent_id) : null;
        }
        db.prepare(`UPDATE worktree_nodes SET is_primary = 0, updated_at = ? WHERE project_id = ?
          AND parent_id IS ? AND type = 'method' AND is_primary = 1`).run(time, project.id, node.parent_id);
        db.prepare('UPDATE worktree_nodes SET is_primary = 1, updated_at = ? WHERE id = ?').run(time, node.id);
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    const row = db.prepare('SELECT * FROM decisions WHERE id = ?').get(id);
    return { decision: materialize(row, runs), nodeStatus: STATUS[type] ?? node.status };
  } finally { db.close(); }
}

export function listDecisions(rootPath, nodeId) {
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const rows = db.prepare(`SELECT d.* FROM decisions d JOIN worktree_nodes n ON n.id = d.node_id
      WHERE n.project_id = ? AND d.node_id = ? ORDER BY d.created_at DESC, d.id DESC`).all(project.id, nodeId);
    return rows.map((row) => materialize(row,
      runEvidence(db, project.id, JSON.parse(row.related_run_ids_json))));
  } finally { db.close(); }
}

function normalized(value) { return String(value ?? '').toLocaleLowerCase(); }

function pathFor(node, byId) {
  const parts = [];
  let current = node;
  while (current) { parts.unshift(current.name); current = byId.get(current.parentId); }
  return parts.join(' / ');
}

function explicitlyNamedAncestor(node, byId, query) {
  let current = node;
  while (current) {
    if (['archived', 'rejected'].includes(current.status) &&
        normalized(query).includes(normalized(current.name))) return current;
    current = byId.get(current.parentId);
  }
  return null;
}

export function searchResearch(rootPath, query, options = {}) {
  const phrase = text(query, 'Search query', 1000);
  const includeArchived = options.includeArchived ?? options.include_archived ?? false;
  const includeRejected = options.includeRejected ?? options.include_rejected ?? false;
  const limit = Math.max(1, Math.min(Number(options.limit) || 20, 100));
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const tree = getTree(rootPath);
    const byId = new Map(tree.nodes.map((node) => [node.id, node]));
    const decisions = db.prepare(`SELECT d.* FROM decisions d JOIN worktree_nodes n ON n.id = d.node_id
      WHERE n.project_id = ? ORDER BY d.created_at DESC`).all(project.id);
    const decisionsByNode = new Map();
    for (const decision of decisions) {
      const list = decisionsByNode.get(decision.node_id) ?? [];
      list.push(decision);
      decisionsByNode.set(decision.node_id, list);
    }
    const runRows = db.prepare(`SELECT n.id, n.name, d.execution_status AS status,
      d.user_intent AS intent, d.command, d.metrics_json AS metricsJson FROM worktree_nodes n
      JOIN run_details d ON d.node_id = n.id WHERE n.project_id = ?`).all(project.id);
    const runsById = new Map(runRows.map((row) => [row.id, row]));
    const generic = /目前|当前|最好|路线|方法|best|current|route|method/i.test(phrase);
    const historical = /历史|归档|否决|失败|当时|放弃|archiv|reject|histor/i.test(phrase);
    const matches = [];
    for (const node of tree.nodes) {
      const namedHistory = explicitlyNamedAncestor(node, byId, phrase);
      let blocked = false;
      let cursor = node;
      while (cursor) {
        if (cursor.status === 'archived' && !includeArchived && !namedHistory) blocked = true;
        if (cursor.status === 'rejected' && !includeRejected && !namedHistory) blocked = true;
        cursor = byId.get(cursor.parentId);
      }
      if (blocked) continue;
      const nodeDecisions = decisionsByNode.get(node.id) ?? [];
      const run = runsById.get(node.id);
      const fields = [node.name, node.motivation, node.summary, ...node.tags,
        ...nodeDecisions.flatMap((item) => [item.summary, item.reason, item.raw_user_text]),
        run?.name, run?.intent, run?.command, run?.metricsJson].filter(Boolean).map(normalized);
      const exactName = normalized(phrase).includes(normalized(node.name));
      const words = normalized(phrase).split(/[\s,，。！？?:;；]+/).filter((word) => word.length > 1);
      let score = exactName ? 100 : 0;
      for (const word of words) if (fields.some((field) => field.includes(word))) score += 10;
      if (generic && node.type === 'method') score += 5;
      if (historical && namedHistory) score += 20;
      if (historical && (includeArchived || includeRejected) && !node.defaultVisible) score += 15;
      if (node.isPrimary && node.defaultVisible) score += 20;
      if (node.status === 'paused') score -= 10;
      if (node.type === 'run' && !historical && !exactName) score -= 10;
      if (score <= 0) continue;
      matches.push({ id: node.id, type: node.type, name: node.name, status: node.status,
        defaultVisible: node.defaultVisible, explicitlyNamedArchivedRoute: namedHistory?.id ?? null,
        isPrimary: node.isPrimary, path: pathFor(node, byId), score,
        summary: node.summary, decisions: nodeDecisions.slice(0, 5).map((item) => ({
          id: item.id, type: item.decision_type, summary: item.summary,
          reason: item.reason, relatedRunIds: JSON.parse(item.related_run_ids_json),
          keyRuns: runEvidence(db, project.id, JSON.parse(item.related_run_ids_json)) })),
        run: run ? { id: run.id, status: run.status,
          metrics: run.metricsJson ? JSON.parse(run.metricsJson) : null } : null });
    }
    matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    return { query: phrase, includeArchived: Boolean(includeArchived), includeRejected: Boolean(includeRejected),
      exactNameHistoryOverride: matches.some((match) => match.explicitlyNamedArchivedRoute),
      results: matches.slice(0, limit) };
  } finally { db.close(); }
}
