import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { openProjectDatabase } from '../project/project-service.js';
import { captureGit } from './git.js';
import { loadConfig, seedFromCommand, sha256, withinWorkspace } from './config.js';
import { describeAsset, insertAssets } from './assets.js';
import { loadMetrics } from './metrics.js';

function now() { return new Date().toISOString(); }

function transaction(db, action) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = action(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

function ensureNode(db, projectId, parentId, type, name) {
  const existing = db.prepare(`SELECT id FROM worktree_nodes WHERE project_id = ?
    AND parent_id IS ? AND type = ? AND name = ? LIMIT 1`).get(projectId, parentId, type, name);
  if (existing) return existing.id;
  const id = randomUUID();
  const timestamp = now();
  db.prepare(`INSERT INTO worktree_nodes
    (id, project_id, type, parent_id, name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`).run(id, projectId, type, parentId, name, timestamp, timestamp);
  return id;
}

function datasetFromConfig(root, config) {
  const values = config?.values ?? {};
  const raw = values.dataset ?? values.data ?? {};
  const data = typeof raw === 'string' ? { name: raw } : raw && typeof raw === 'object' ? raw : {};
  const name = data.name ?? values.dataset_name ?? null;
  const splitValue = data.split_path ?? data.split_file ?? values.split_path ?? values.split_file ?? null;
  const splitPath = splitValue ? withinWorkspace(root, String(splitValue)) : null;
  const splitHash = splitPath ? sha256(readSmallSplit(splitPath)) : null;
  return { name, splitPath, splitHash, strategy: data.split_strategy ?? values.split_strategy ?? null,
    preprocessingHash: data.preprocessing_hash ?? values.preprocessing_hash ?? null };
}

function readSmallSplit(path) {
  // A split manifest is expected to be small; large raw datasets are never read into the database.
  if (statSync(path).size > 16 * 1024 * 1024) throw new Error('Split manifest exceeds 16 MiB');
  return readFileSync(path);
}

export function createRun(rootPath, input) {
  if (!input || typeof input.command !== 'string' || !input.command.trim()) {
    throw new Error('Experiment command is required');
  }
  if (typeof input.intent !== 'string' || !input.intent.trim()) throw new Error('Original experiment intent is required');
  const { db, root, dataDir, project } = openProjectDatabase(rootPath);
  try {
    const git = captureGit(root);
    const config = loadConfig(root, input.configPath, input.command, input.configValues);
    const dataset = datasetFromConfig(root, config);
    const id = randomUUID();
    const snapshotDir = join(dataDir, 'snapshots', id);
    mkdirSync(snapshotDir, { recursive: true, mode: 0o700 });
    const manifestPath = join(snapshotDir, 'manifest.json');
    const manifest = {
      runId: id, capturedAt: now(), git, config: config && { path: config.path, hash: config.hash,
        source: config.source },
      dataset, commandHash: sha256(input.command),
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
    const methodName = input.methodName?.trim() || 'Unclassified method';
    const groupName = input.groupName?.trim() || 'Experiments';
    const runName = input.runName?.trim() || `${methodName} ${id.slice(0, 8)}`;
    transaction(db, () => {
      const questionId = ensureNode(db, project.id, null, 'research_question', project.name);
      const methodId = ensureNode(db, project.id, questionId, 'method', methodName);
      const groupId = ensureNode(db, project.id, methodId, 'experiment_group', groupName);
      const timestamp = now();
      db.prepare(`INSERT INTO worktree_nodes
        (id, project_id, type, parent_id, name, status, created_at, updated_at)
        VALUES (?, ?, 'run', ?, ?, 'active', ?, ?)`).run(id, project.id, groupId, runName, timestamp, timestamp);
      db.prepare(`INSERT INTO run_details
        (node_id, execution_status, user_intent, command, cwd, git_commit, git_branch, git_dirty,
         git_diff_hash, git_untracked_json, config_json, config_path, config_hash, config_source, dataset_json,
         dataset_name, split_path, split_hash, seed, snapshot_manifest_path)
        VALUES (?, 'created', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, input.intent, input.command, root, git.commit, git.branch,
          git.dirty === null ? null : Number(git.dirty), git.diffHash, JSON.stringify(git.untrackedFiles),
          config ? JSON.stringify(config.values) : null, config?.path ?? null, config?.hash ?? null,
          config?.source ?? null,
          JSON.stringify(dataset), dataset.name, dataset.splitPath, dataset.splitHash,
          input.seed ?? seedFromCommand(input.command) ?? config?.values.seed ?? null, manifestPath);
    });
    return { id, status: 'created', snapshotManifestPath: manifestPath };
  } finally { db.close(); }
}

export function markRunRunning(rootPath, runId) {
  const { db } = openProjectDatabase(rootPath);
  try {
    const result = db.prepare(`UPDATE run_details SET execution_status = 'running', started_at = ?
      WHERE node_id = ? AND execution_status = 'created'`).run(now(), runId);
    if (result.changes !== 1) throw new Error(`Run ${runId} is not in created state`);
  } finally { db.close(); }
}

function redactLog(text) {
  return String(text ?? '').replace(/((?:api[_-]?key|token|password|secret)\s*[:=]\s*)\S+/gi, '$1[REDACTED]');
}

export async function finishRun(rootPath, runId, outcome) {
  const { db, root, dataDir } = openProjectDatabase(rootPath);
  try {
    const current = db.prepare('SELECT execution_status, config_path, started_at FROM run_details WHERE node_id = ?').get(runId);
    if (!current || !['created', 'running'].includes(current.execution_status)) {
      throw new Error(`Run ${runId} cannot be finalized`);
    }
    const status = outcome.cancelled ? 'cancelled' : outcome.exitCode === 0 ? 'succeeded' : 'failed';
    let metrics = null;
    let metricsError = null;
    if (outcome.metricsPath) {
      try { metrics = loadMetrics(root, outcome.metricsPath); }
      catch (error) { metricsError = String(error); }
    }
    const assets = [];
    const discovered = [];
    if (metrics) {
      const since = Date.parse(current.started_at ?? 0);
      for (const entry of readdirSync(dirname(metrics.path), { withFileTypes: true }).slice(0, 200)) {
        if (!entry.isFile()) continue;
        const path = join(dirname(metrics.path), entry.name);
        if (path !== metrics.path && statSync(path).mtimeMs >= since - 1000) discovered.push(path);
      }
    }
    const candidates = [
      current.config_path && { path: current.config_path, type: 'config' },
      metrics && { path: metrics.path, type: 'metrics' },
      ...discovered.map((path) => ({ path, type: null })),
      ...(outcome.assetPaths ?? []).map((path) => ({ path, type: null })),
    ].filter(Boolean);
    const seen = new Set();
    const assetErrors = [];
    for (const candidate of candidates) {
      try {
        const asset = await describeAsset(root, candidate.path, candidate.type);
        if (!seen.has(asset.path)) { assets.push(asset); seen.add(asset.path); }
      } catch (error) { assetErrors.push(String(error)); }
    }
    const logPath = join(dataDir, 'snapshots', runId, 'execution.log');
    const log = [outcome.stdout && `STDOUT\n${redactLog(outcome.stdout)}`,
      outcome.stderr && `STDERR\n${redactLog(outcome.stderr)}`].filter(Boolean).join('\n\n');
    if (log) {
      try {
        writeFileSync(logPath, log, { mode: 0o600 });
        assets.push(await describeAsset(root, logPath, 'log'));
      } catch (error) { assetErrors.push(String(error)); }
    }
    transaction(db, () => {
      db.prepare(`UPDATE run_details SET execution_status = ?, ended_at = ?, exit_code = ?,
        metrics_json = ?, metrics_status = ?, error_message = ? WHERE node_id = ?`)
        .run(status, now(), outcome.exitCode ?? null, metrics ? JSON.stringify(metrics.values) : null,
          metrics ? 'collected' : 'missing',
          [outcome.errorMessage || (status === 'failed' ? redactLog(outcome.stderr).trim().split('\n').at(-1) : null),
            metricsError, ...assetErrors].filter(Boolean).join('; ') || null, runId);
      insertAssets(db, runId, assets);
    });
    return getRunDetail(root, runId);
  } finally { db.close(); }
}

export function getRunDetail(rootPath, runId) {
  const { db } = openProjectDatabase(rootPath);
  try {
    const row = db.prepare(`SELECT n.id, n.name, n.parent_id, d.* FROM worktree_nodes n
      JOIN run_details d ON d.node_id = n.id WHERE n.id = ?`).get(runId);
    if (!row) return null;
    const assets = db.prepare(`SELECT id, type, path, content_hash AS contentHash,
      size, metadata_json AS metadataJson, created_at AS createdAt
      FROM assets WHERE run_node_id = ? ORDER BY created_at, id`).all(runId);
    return {
      id: row.id, name: row.name, groupId: row.parent_id, status: row.execution_status,
      intent: row.user_intent, command: row.command, cwd: row.cwd,
      startedAt: row.started_at, endedAt: row.ended_at, exitCode: row.exit_code,
      git: { commit: row.git_commit, branch: row.git_branch, dirty: row.git_dirty === null ? null : Boolean(row.git_dirty),
        diffHash: row.git_diff_hash, untrackedFiles: JSON.parse(row.git_untracked_json ?? '[]') },
      config: { path: row.config_path, hash: row.config_hash, source: row.config_source,
        values: row.config_json ? JSON.parse(row.config_json) : null },
      metrics: row.metrics_json ? JSON.parse(row.metrics_json) : null,
      metricsStatus: row.metrics_status,
      dataset: row.dataset_json ? JSON.parse(row.dataset_json) : null,
      seed: row.seed, errorMessage: row.error_message,
      snapshotManifestPath: row.snapshot_manifest_path,
      assets: assets.map(({ metadataJson, ...asset }) => ({ ...asset, metadata: JSON.parse(metadataJson) })),
    };
  } finally { db.close(); }
}

export function listRecentRuns(rootPath, limit = 30) {
  const { db } = openProjectDatabase(rootPath);
  try {
    return db.prepare(`SELECT n.id, n.name, d.execution_status AS status, d.started_at AS startedAt,
      d.ended_at AS endedAt, d.metrics_status AS metricsStatus
      FROM worktree_nodes n JOIN run_details d ON d.node_id = n.id
      ORDER BY n.created_at DESC LIMIT ?`).all(Math.max(1, Math.min(Number(limit) || 30, 200)));
  } finally { db.close(); }
}

export function recoverInterruptedRuns(rootPath) {
  const { db } = openProjectDatabase(rootPath);
  try {
    return db.prepare(`UPDATE run_details SET execution_status = 'interrupted', ended_at = ?,
      error_message = 'Harness stopped before this run was finalized'
      WHERE execution_status = 'running'`).run(now()).changes;
  } finally { db.close(); }
}
