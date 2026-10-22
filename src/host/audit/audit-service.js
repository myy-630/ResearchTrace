import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openProjectDatabase } from '../project/project-service.js';
import { getRunDetail } from '../experiment/run-repository.js';
import { comparable, numericMatch, valueAtPath } from '../trace/matching.js';

export const AUDIT_RULES_VERSION = 'researchtrace-audit-v1';
const stamp = () => new Date().toISOString();
const clean = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function splitKey(value) {
  const raw = clean(value);
  if (raw.includes('patient')) return 'patient';
  if (raw.includes('temporal') || raw.includes('time')) return 'time';
  if (raw.includes('random')) return 'random';
  if (raw.includes('site')) return 'site';
  return raw;
}

function equalValue(expected, actual) {
  const a = comparable(expected);
  const b = comparable(actual);
  return typeof a === 'number' && typeof b === 'number'
    ? Math.abs(a - b) <= Math.max(1e-12, Math.abs(a) * 1e-9) : a === b;
}

function metricValue(run, metric) {
  if (!metric || !run?.metrics) return null;
  const pair = Object.entries(run.metrics).find(([name]) => clean(name) === clean(metric));
  return typeof pair?.[1] === 'number' ? pair[1] : null;
}

function claimFromRow(row) {
  return { id: row.id, documentId: row.document_id, type: row.claim_type,
    originalText: row.original_text, normalized: JSON.parse(row.normalized_json),
    sourceLocation: JSON.parse(row.source_location_json), status: row.status };
}

function finding(ruleId, severity, message, claim, run, experimentEvidence, recommendation) {
  return { id: randomUUID(), ruleId, severity, message, claimId: claim?.id ?? null,
    runId: run?.id ?? null,
    paperEvidence: claim ? { quote: claim.originalText, location: claim.sourceLocation,
      normalized: claim.normalized } : {}, experimentEvidence, recommendation };
}

function nodeIndex(db, projectId) {
  return new Map(db.prepare('SELECT id, parent_id, type, name, status FROM worktree_nodes WHERE project_id = ?')
    .all(projectId).map((row) => [row.id, row]));
}

function ancestry(nodes, id) {
  const line = [];
  let node = nodes.get(id);
  const seen = new Set();
  while (node) {
    if (seen.has(node.id)) throw new Error('Research tree contains a cycle');
    seen.add(node.id);
    line.unshift(node);
    node = node.parent_id ? nodes.get(node.parent_id) : null;
  }
  return line;
}

function methodId(nodes, runId) {
  return ancestry(nodes, runId).filter((node) => node.type === 'method').at(-1)?.id ?? null;
}

function loadRunRows(db, projectId) {
  return db.prepare(`SELECT n.id, n.name, d.metrics_json, d.config_json, d.dataset_json, d.seed
    FROM worktree_nodes n JOIN run_details d ON d.node_id = n.id
    WHERE n.project_id = ? AND d.execution_status = 'succeeded'`).all(projectId)
    .map((row) => ({ id: row.id, name: row.name, metrics: row.metrics_json ? JSON.parse(row.metrics_json) : null,
      config: row.config_json ? JSON.parse(row.config_json) : null,
      dataset: row.dataset_json ? JSON.parse(row.dataset_json) : null, seed: row.seed }));
}

function baselineRun(root, claim, rows, nodes) {
  const facts = claim.normalized;
  if (!facts.baseline_method || facts.baseline_value == null) return null;
  const matches = rows.filter((row) => {
    const names = ancestry(nodes, row.id).filter((node) => node.type === 'method').map((node) => node.name);
    if (typeof row.config?.method === 'string') names.push(row.config.method);
    if (!names.some((name) => clean(name) === clean(facts.baseline_method))) return false;
    return ['exact', 'rounded'].includes(numericMatch(
      metricValue(row, facts.metric), facts.baseline_value, claim.originalText).kind);
  });
  return matches.length === 1 ? getRunDetail(root, matches[0].id) : null;
}

function statisticRuns(root, claim, anchor, rows, nodes) {
  const sameMethod = methodId(nodes, anchor.id);
  return rows.filter((row) => methodId(nodes, row.id) === sameMethod &&
    typeof metricValue(row, claim.normalized.metric) === 'number' && row.seed != null &&
    (!anchor.dataset?.name || !row.dataset?.name || clean(anchor.dataset.name) === clean(row.dataset.name)) &&
    (!anchor.dataset?.strategy || !row.dataset?.strategy ||
      splitKey(anchor.dataset.strategy) === splitKey(row.dataset.strategy)))
    .map((row) => getRunDetail(root, row.id));
}

function inspectClaim(root, claim, links, rows, nodes, tolerance) {
  const findings = [];
  const confirmed = links.filter((link) => link.status === 'confirmed');
  const run = confirmed.length === 1 ? getRunDetail(root, confirmed[0].run_node_id) : null;
  const facts = claim.normalized;
  if (claim.type === 'result_comparison' && !run) {
    const candidates = links.filter((link) => link.status === 'candidate')
      .sort((a, b) => b.confidence - a.confidence);
    const clearCandidate = candidates[0] &&
      (!candidates[1] || candidates[0].confidence - candidates[1].confidence >= 15 / 115) &&
      JSON.parse(candidates[0].reasons_json).some((reason) => reason.startsWith('method '));
    if (claim.status === 'conflict' && clearCandidate) {
      const suspected = getRunDetail(root, candidates[0].run_node_id);
      const actual = metricValue(suspected, facts.metric);
      if (actual != null && numericMatch(actual, facts.target_value, claim.originalText, tolerance).kind === 'mismatch') {
        findings.push(finding('RESULT_MISMATCH', 'error',
          `Paper ${facts.metric} ${facts.target_value} conflicts with the best grounded candidate run ${actual}`,
          claim, suspected, { metric: facts.metric, actual, metrics: suspected.metrics,
            linkStatus: 'candidate' },
          'Confirm whether this is the intended run, then correct the paper value or binding.'));
      }
    }
    findings.push(finding('TRACE_INCOMPLETE', 'warning',
      'Result claim has no confirmed run evidence', claim, null,
      { candidateRunIds: candidates.map((link) => link.run_node_id) },
      'Trace the claim and confirm the intended run before relying on this result.'));
    return findings;
  }
  if (!run) return findings;

  // A. The recorded metric is the sole numerical source of truth.
  if (claim.type === 'result_comparison') {
    const actual = metricValue(run, facts.metric);
    if (actual == null) findings.push(finding('RESULT_METRIC_MISSING', 'warning',
      `Run has no recorded ${facts.metric} metric`, claim, run,
      { metrics: run.metrics }, 'Collect a structured metric for the linked run.'));
    else if (numericMatch(actual, facts.target_value, claim.originalText, tolerance).kind === 'mismatch') {
      findings.push(finding('RESULT_MISMATCH', 'error',
        `Paper ${facts.metric} ${facts.target_value} differs from run ${actual}`, claim, run,
        { metric: facts.metric, actual, metrics: run.metrics },
        'Check the paper number or bind the claim to the correct run.'));
    }
  }

  // B. Compare every stated parameter for which the run captured a value.
  if (claim.type === 'experiment_setting') {
    for (const parameter of facts.parameters ?? []) {
      const actual = valueAtPath(run.config?.values, parameter.name);
      if (actual === undefined) continue;
      if (!equalValue(parameter.value, actual)) findings.push(finding('PARAMETER_MISMATCH', 'error',
        `Paper ${parameter.name} ${String(parameter.value)} differs from config ${String(actual)}`,
        claim, run, { parameter: parameter.name, actual, configPath: run.config.path,
          configHash: run.config.hash }, 'Correct the paper setting or confirm the linked run.'));
    }
  }

  // C. Dataset, split, and optional source hashes must agree with captured provenance.
  if (claim.type === 'data') {
    if (facts.dataset && run.dataset?.name && clean(facts.dataset) !== clean(run.dataset.name)) {
      findings.push(finding('DATASET_MISMATCH', 'error',
        `Paper dataset ${facts.dataset} differs from run ${run.dataset.name}`, claim, run,
        { dataset: run.dataset }, 'Correct the dataset description or bind the correct run.'));
    }
    if (facts.split_strategy && run.dataset?.strategy &&
        splitKey(facts.split_strategy) !== splitKey(run.dataset.strategy)) {
      findings.push(finding('SPLIT_MISMATCH', 'error',
        `Paper split ${facts.split_strategy} differs from run ${run.dataset.strategy}`, claim, run,
        { dataset: run.dataset }, 'Check the split protocol and the paper wording.'));
    }
    if (facts.split_hash && run.dataset?.splitHash && facts.split_hash !== run.dataset.splitHash) {
      findings.push(finding('SPLIT_HASH_MISMATCH', 'error',
        'Paper split file hash differs from the recorded run', claim, run,
        { splitPath: run.dataset.splitPath, splitHash: run.dataset.splitHash },
        'Verify that the same split manifest was used.'));
    }
    if (facts.preprocessing && run.config?.values) {
      const actual = valueAtPath(run.config.values, 'preprocessing');
      if (actual !== undefined && !equalValue(facts.preprocessing, actual)) findings.push(
        finding('PREPROCESSING_MISMATCH', 'error',
          `Paper preprocessing ${facts.preprocessing} differs from run ${String(actual)}`, claim,
          run, { preprocessing: actual }, 'Check preprocessing configuration and paper text.'));
    }
  }

  // D. Recompute only when the seed cohort is unambiguous and complete.
  if (claim.type === 'statistical' && facts.metric && (facts.mean != null || facts.std != null)) {
    const cohort = statisticRuns(root, claim, run, rows, nodes);
    const bySeed = new Map();
    for (const item of cohort) {
      const group = bySeed.get(item.seed) ?? [];
      group.push(item);
      bySeed.set(item.seed, group);
    }
    if (bySeed.size < (facts.repetitions ?? 1)) {
      findings.push(finding('STATISTICS_INSUFFICIENT_RUNS', 'warning',
        `Paper reports ${facts.repetitions ?? 'multiple'} repeats; only ${bySeed.size} distinct seeds are recorded`,
        claim, run, { runIds: cohort.map((item) => item.id), seeds: [...bySeed.keys()] },
        'Record or link the missing seed runs before validating mean and standard deviation.'));
    } else if (bySeed.size !== (facts.repetitions ?? bySeed.size) ||
        [...bySeed.values()].some((group) => group.length !== 1)) {
      findings.push(finding('STATISTICS_AMBIGUOUS_RUNS', 'warning',
        'Multiple possible seed cohorts or duplicate runs prevent deterministic recomputation',
        claim, run, { runIds: cohort.map((item) => item.id), seeds: [...bySeed.keys()] },
        'Select an exact seed cohort for the paper statistic.'));
    } else {
      const values = cohort.map((item) => metricValue(item, facts.metric));
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const std = values.length > 1
        ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)) : 0;
      const evidence = { runIds: cohort.map((item) => item.id), seeds: cohort.map((item) => item.seed),
        values, mean, sampleStd: std };
      if (facts.mean != null && numericMatch(mean, facts.mean, claim.originalText, tolerance).kind === 'mismatch') {
        findings.push(finding('MEAN_MISMATCH', 'error',
          `Paper mean ${facts.mean} differs from recomputed mean ${mean}`, claim, run, evidence,
          'Recalculate the reported mean from the intended seed runs.'));
      }
      if (facts.std != null && numericMatch(std, facts.std, claim.originalText, tolerance).kind === 'mismatch') {
        findings.push(finding('STD_MISMATCH', 'error',
          `Paper std ${facts.std} differs from recomputed sample std ${std}`, claim, run, evidence,
          'Recalculate the reported sample standard deviation.'));
      }
    }
  }

  // E. A key result requires enough provenance to reproduce the link.
  if (claim.type === 'result_comparison') {
    const missing = [];
    if (!run.config?.values || !run.config?.hash) missing.push('config');
    if (!run.git?.commit) missing.push('Git commit');
    if (!run.dataset?.name || !run.dataset?.splitHash) missing.push('dataset/split');
    if (missing.length) findings.push(finding('TRACE_INCOMPLETE', 'warning',
      `Result evidence is missing ${missing.join(', ')}`, claim, run,
      { missing, config: run.config, git: run.git, dataset: run.dataset },
      'Capture the missing run provenance before citing this result.'));
  }

  // F. A comparison needs a uniquely identifiable baseline and compatible protocol.
  if (claim.type === 'result_comparison' && facts.baseline_method && facts.baseline_value != null) {
    const baseline = baselineRun(root, claim, rows, nodes);
    if (!baseline) findings.push(finding('COMPARABILITY_UNKNOWN', 'warning',
      'No unique baseline run supports this comparison', claim, run,
      { baselineMethod: facts.baseline_method, baselineValue: facts.baseline_value },
      'Link the exact baseline run and verify protocol comparability.'));
    else {
      const differences = [];
      for (const [label, a, b] of [
        ['dataset', run.dataset?.name, baseline.dataset?.name],
        ['split', run.dataset?.splitHash, baseline.dataset?.splitHash],
        ['horizon', valueAtPath(run.config?.values, 'future_window'),
          valueAtPath(baseline.config?.values, 'future_window')],
        ['task', valueAtPath(run.config?.values, 'task'), valueAtPath(baseline.config?.values, 'task')],
        ['metric definition', valueAtPath(run.config?.values, 'metric_definition'),
          valueAtPath(baseline.config?.values, 'metric_definition')],
      ]) {
        if (a != null && b != null && !equalValue(a, b)) differences.push({ field: label, target: a, baseline: b });
      }
      if (differences.length) findings.push(finding('INCOMPARABLE_PROTOCOL', 'error',
        `Compared runs differ in ${differences.map((item) => item.field).join(', ')}`,
        claim, run, { baselineRunId: baseline.id, differences },
        'Use runs with the same evaluation protocol or qualify the comparison.'));
    }
  }

  // G. Confirmed current conclusions must disclose archived or rejected provenance.
  if (claim.type === 'result_comparison') {
    const historical = ancestry(nodes, run.id).filter((node) =>
      node.status === 'archived' || node.status === 'rejected');
    if (historical.length) findings.push(finding('ARCHIVED_EVIDENCE', 'warning',
      `Current result cites ${historical.map((node) => `${node.name} (${node.status})`).join(', ')}`,
      claim, run, { historicalNodes: historical.map((node) => ({ id: node.id, status: node.status })) },
      'Reopen the route explicitly or qualify this result as historical.'));
  }

  // H. A dirty commit hash alone is not a saved patch; untracked files need preservation too.
  if (claim.type === 'result_comparison' && run.git?.dirty) {
    const patchPath = join(root, '.researchtrace', 'snapshots', run.id, 'git.patch');
    if (!existsSync(patchPath) || run.git.untrackedFiles.length) findings.push(finding('DIRTY_GIT_RISK', 'warning',
      'Key result came from a dirty workspace without a complete saved diff snapshot',
      claim, run, { commit: run.git.commit, diffHash: run.git.diffHash,
        patchPath: existsSync(patchPath) ? patchPath : null,
        untrackedFiles: run.git.untrackedFiles },
      'Save the diff and untracked inputs, or rerun from a clean commit.'));
  }
  return findings;
}

function reportFromRows(session, rows) {
  return { id: session.id, documentId: session.document_id, documentHash: session.document_hash,
    rulesVersion: session.rules_version, createdAt: session.created_at,
    counts: { error: session.error_count, warning: session.warning_count, info: session.info_count },
    findings: rows.map((row) => ({ id: row.id, ruleId: row.rule_id, severity: row.severity,
      message: row.message, claimId: row.claim_id, runId: row.run_node_id,
      paperEvidence: JSON.parse(row.paper_evidence_json),
      experimentEvidence: JSON.parse(row.experiment_evidence_json), recommendation: row.recommendation })) };
}

export function getAuditReport(rootPath, sessionId) {
  const { db } = openProjectDatabase(rootPath);
  try {
    const session = db.prepare('SELECT * FROM audit_sessions WHERE id = ?').get(sessionId);
    if (!session) throw new Error(`Audit report not found: ${sessionId}`);
    const rows = db.prepare('SELECT * FROM audit_findings WHERE audit_session_id = ? ORDER BY rowid')
      .all(sessionId);
    return reportFromRows(session, rows);
  } finally { db.close(); }
}

export function listAuditReports(rootPath, documentId = null) {
  const { db } = openProjectDatabase(rootPath);
  try {
    return (documentId
      ? db.prepare('SELECT * FROM audit_sessions WHERE document_id = ? ORDER BY created_at DESC, id DESC').all(documentId)
      : db.prepare('SELECT * FROM audit_sessions ORDER BY created_at DESC, id DESC').all())
      .map((row) => ({ id: row.id, documentId: row.document_id, documentHash: row.document_hash,
        rulesVersion: row.rules_version, createdAt: row.created_at,
        counts: { error: row.error_count, warning: row.warning_count, info: row.info_count } }));
  } finally { db.close(); }
}

export function runAudit(rootPath, documentId, options = {}) {
  if (options.tolerance != null && (!Number.isFinite(options.tolerance) || options.tolerance < 0 || options.tolerance > 1)) {
    throw new Error('Tolerance must be between 0 and 1');
  }
  const { db, root, dataDir, project } = openProjectDatabase(rootPath);
  try {
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
    if (!document) throw new Error(`Document not found: ${documentId}`);
    const claims = db.prepare('SELECT * FROM claims WHERE document_id = ? ORDER BY created_at, id')
      .all(documentId).map(claimFromRow);
    const nodes = nodeIndex(db, project.id);
    const rows = loadRunRows(db, project.id);
    const findings = claims.flatMap((claim) => {
      const links = db.prepare('SELECT * FROM claim_run_links WHERE claim_id = ?').all(claim.id);
      return inspectClaim(root, claim, links, rows, nodes, options.tolerance ?? 0);
    });
    const counts = { error: findings.filter((item) => item.severity === 'error').length,
      warning: findings.filter((item) => item.severity === 'warning').length,
      info: findings.filter((item) => item.severity === 'info').length };
    const id = randomUUID();
    const createdAt = stamp();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`INSERT INTO audit_sessions (id,document_id,document_hash,rules_version,created_at,
        error_count,warning_count,info_count) VALUES (?,?,?,?,?,?,?,?)`)
        .run(id, documentId, document.content_hash, AUDIT_RULES_VERSION, createdAt,
          counts.error, counts.warning, counts.info);
      const insert = db.prepare(`INSERT INTO audit_findings (id,audit_session_id,rule_id,severity,message,
        claim_id,run_node_id,paper_evidence_json,experiment_evidence_json,recommendation)
        VALUES (?,?,?,?,?,?,?,?,?,?)`);
      for (const item of findings) insert.run(item.id, id, item.ruleId, item.severity, item.message,
        item.claimId, item.runId, JSON.stringify(item.paperEvidence),
        JSON.stringify(item.experimentEvidence), item.recommendation);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    const report = { id, documentId, documentHash: document.content_hash,
      rulesVersion: AUDIT_RULES_VERSION, createdAt, counts, findings };
    const directory = join(dataDir, 'reports');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const jsonPath = join(directory, `audit-${id}.json`);
    const mdPath = join(directory, `audit-${id}.md`);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), { mode: 0o600 });
    writeFileSync(mdPath, [`# ResearchTrace audit ${id}`, '', `Document: ${document.path}`,
      `Hash: ${document.content_hash}`, `Rules: ${AUDIT_RULES_VERSION}`,
      `Errors: ${counts.error}; Warnings: ${counts.warning}; Info: ${counts.info}`, '',
      ...findings.flatMap((item) => [`## ${item.severity.toUpperCase()} ${item.ruleId}`, '',
        item.message, '', `Claim: ${item.claimId ?? '—'}; Run: ${item.runId ?? '—'}`,
        `Recommendation: ${item.recommendation}`, ''])].join('\n'), { mode: 0o600 });
    return { ...report, exportPaths: { json: jsonPath, markdown: mdPath } };
  } finally { db.close(); }
}
