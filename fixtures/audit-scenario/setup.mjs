import { randomUUID, createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProject, openProjectDatabase } from '../../src/host/project/project-service.js';
import { createRun, finishRun, markRunRunning } from '../../src/host/experiment/run-repository.js';
import { getTree, setNodeStatus } from '../../src/host/tree/tree-service.js';

const sourcePath = fileURLToPath(new URL('./project/paper/incorrect.md', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');

const claims = [
  { type: 'result_comparison', quote: 'On AF-demo, AuditFuture30 improved AUPRC from 0.5490 with AuditRecon to 0.5700.',
    normalized: { metric: 'AUPRC', baseline_method: 'AuditRecon', baseline_value: 0.549,
      target_method: 'AuditFuture30', target_value: 0.57, dataset: 'AF-demo' }, run: 'future' },
  { type: 'experiment_setting', quote: 'AuditFuture30 used a learning rate of 0.001.',
    normalized: { parameters: [{ name: 'learning_rate', value: 0.001, scope: 'AuditFuture30' }] }, run: 'future' },
  { type: 'data', quote: 'AF-demo was split randomly into training and test sets.',
    normalized: { dataset: 'AF-demo', split_strategy: 'random' }, run: 'future' },
  { type: 'statistical', quote: 'Across 3 random seeds, AuditStats achieved mean AUPRC 0.5500 with standard deviation 0.0100.',
    normalized: { metric: 'AUPRC', method: 'AuditStats', repetitions: 3, mean: 0.55, std: 0.01 }, run: 'stats1' },
  { type: 'result_comparison', quote: 'AuditArchived achieved AUPRC 0.4000 on AF-demo.',
    normalized: { metric: 'AUPRC', target_method: 'AuditArchived', target_value: 0.4,
      dataset: 'AF-demo' }, run: 'archived' },
  { type: 'experiment_setting', quote: 'AuditStats used learning rate 0.0001.',
    normalized: { parameters: [{ name: 'learning_rate', value: 0.0001, scope: 'AuditStats' }] }, run: 'stats1' },
];

async function addRun(root, method, seed, metric, dataset, dirty = false) {
  const run = createRun(root, { intent: `Audit fixture ${method} seed ${seed}`, command: 'echo audit-fixture',
    methodName: method, runName: `${method} seed ${seed}`, seed,
    configValues: { method, learning_rate: 0.0001, future_window: 30, task: 'AF prediction' } });
  markRunRunning(root, run.id);
  await finishRun(root, run.id, { exitCode: 0 });
  const { db } = openProjectDatabase(root);
  try {
    db.prepare(`UPDATE run_details SET metrics_json = ?, metrics_status = 'collected', dataset_json = ?,
      dataset_name = ?, split_hash = ?, git_commit = ?, git_dirty = ?, git_diff_hash = ?,
      git_untracked_json = '[]' WHERE node_id = ?`).run(
      JSON.stringify({ auprc: metric }), JSON.stringify(dataset), dataset.name, dataset.splitHash,
      'fixture-commit', Number(dirty), dirty ? 'fixture-diff-hash' : null, run.id);
  } finally { db.close(); }
  return run.id;
}

export async function seedAuditScenario(rootPath) {
  const root = resolve(rootPath);
  initializeProject(root);
  const paperPath = join(root, 'paper', 'incorrect.md');
  mkdirSync(dirname(paperPath), { recursive: true });
  if (!existsSync(paperPath)) writeFileSync(paperPath, readFileSync(sourcePath));
  const splitPath = join(root, 'patients.csv');
  const reconSplitPath = join(root, 'recon-patients.csv');
  if (!existsSync(splitPath)) writeFileSync(splitPath,
    readFileSync(fileURLToPath(new URL('./project/patients.csv', import.meta.url))));
  if (!existsSync(reconSplitPath)) writeFileSync(reconSplitPath,
    readFileSync(fileURLToPath(new URL('./project/recon-patients.csv', import.meta.url))));
  const { db: check } = openProjectDatabase(root);
  try {
    const existing = check.prepare('SELECT id FROM documents WHERE path = ?').get(paperPath);
    if (existing) return { documentId: existing.id, existing: true };
  } finally { check.close(); }
  const patient = { name: 'AF-demo', strategy: 'patient-level',
    splitHash: hash(readFileSync(splitPath)), splitPath };
  const different = { ...patient, splitHash: hash(readFileSync(reconSplitPath)),
    splitPath: reconSplitPath };
  const runIds = {
    future: await addRun(root, 'AuditFuture30', 7, 0.5614, patient, true),
    recon: await addRun(root, 'AuditRecon', 7, 0.549, different),
    stats1: await addRun(root, 'AuditStats', 1, 0.5, patient),
    stats2: await addRun(root, 'AuditStats', 2, 0.51, patient),
    stats3: await addRun(root, 'AuditStats', 3, 0.52, patient),
    archived: await addRun(root, 'AuditArchived', 7, 0.4, patient),
  };
  const archivedMethod = getTree(root).nodes.find((node) =>
    node.type === 'method' && node.name === 'AuditArchived');
  setNodeStatus(root, archivedMethod.id, 'archived');
  const content = readFileSync(paperPath, 'utf8');
  const documentId = randomUUID();
  const time = new Date().toISOString();
  const { db } = openProjectDatabase(root);
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare(`INSERT INTO documents (id,path,type,content_hash,parsed_at,parser_version)
        VALUES (?,?,?,?,?,?)`).run(documentId, paperPath, 'md', hash(content), time, 'audit-fixture-v1');
      const claimIds = [];
      for (const item of claims) {
        const id = randomUUID();
        const offset = content.indexOf(item.quote);
        if (offset < 0) throw new Error(`Fixture quote missing: ${item.quote}`);
        const line = content.slice(0, offset).split('\n').length;
        db.prepare(`INSERT INTO claims (id,document_id,claim_type,original_text,normalized_json,
          source_location_json,parse_model,parse_version,status,created_at,updated_at)
          VALUES (?,?,?,?,?,?, 'fixture','golden-v1','matched',?,?)`).run(id, documentId,
          item.type, item.quote, JSON.stringify(item.normalized),
          JSON.stringify({ format: 'md', lineStart: line, lineEnd: line, quoteHash: hash(item.quote) }),
          time, time);
        db.prepare(`INSERT INTO claim_run_links (id,claim_id,run_node_id,status,confidence,reasons_json,created_at)
          VALUES (?,?,?,'confirmed',1,'["golden fixture linkage"]',?)`).run(randomUUID(), id,
          runIds[item.run], time);
        claimIds.push(id);
      }
      db.exec('COMMIT');
      return { documentId, runIds, claimIds, existing: false };
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  } finally { db.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? resolve(process.argv[2])
    : fileURLToPath(new URL('./project/', import.meta.url));
  console.log(JSON.stringify(await seedAuditScenario(root), null, 2));
}
