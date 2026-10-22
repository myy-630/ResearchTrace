import { randomUUID, createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedAuditScenario } from '../audit-scenario/setup.mjs';
import { createRun, finishRun, markRunRunning } from '../../src/host/experiment/run-repository.js';
import { openProjectDatabase } from '../../src/host/project/project-service.js';
import { createNode, getTree } from '../../src/host/tree/tree-service.js';

const source = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function addRun(root, groupId, method, index, metric, failed = false) {
  const name = `${method} ${index < 2 ? 'twin ' : ''}seed ${index + 11}`;
  const run = createRun(root, { intent: `Full fixture: ${name}`,
    command: `node train.mjs --output results/${method}-${index}/metrics.json`,
    groupId, runName: name, seed: index + 11,
    configValues: { method, learning_rate: 0.0001, task: 'AF prediction',
      dataset: { name: 'AF-demo', split_path: 'patients.csv', split_strategy: 'patient-level' } } });
  markRunRunning(root, run.id);
  if (failed) await finishRun(root, run.id, { exitCode: 1, stderr: 'fixture training failed' });
  else {
    const metricsPath = join(root, 'results', `${method}-${index}`, 'metrics.json');
    mkdirSync(dirname(metricsPath), { recursive: true });
    writeFileSync(metricsPath, JSON.stringify({ auprc: metric }));
    await finishRun(root, run.id, { exitCode: 0,
      metricsPath: join('results', `${method}-${index}`, 'metrics.json') });
  }
  return run.id;
}

export async function seedFullScenario(rootPath) {
  const root = resolve(rootPath);
  const audit = await seedAuditScenario(root);
  const marker = join(root, 'paper', 'ambiguous.md');
  const { db } = openProjectDatabase(root);
  try {
    const existing = db.prepare('SELECT id FROM documents WHERE path = ?').get(marker);
    if (existing) return { ...audit, ambiguousDocumentId: existing.id, existing: true };
  } finally { db.close(); }

  copyFileSync(source('../demo-research-project/train.mjs'), join(root, 'train.mjs'));
  copyFileSync(source('../demo-research-project/paper/claims.md'), join(root, 'paper', 'claims.md'));
  copyFileSync(source('../demo-research-project/paper/claims.tex'), join(root, 'paper', 'claims.tex'));
  copyFileSync(source('../demo-research-project/paper/claims.docx'), join(root, 'paper', 'claims.docx'));

  const methods = new Map(getTree(root).nodes.filter((node) => node.type === 'method')
    .map((node) => [node.name, node.id]));
  const groups = [
    ['AuditFuture30', 'Ablations'], ['AuditRecon', 'Alternative baselines'],
    ['AuditArchived', 'Historical checks'],
  ].map(([method, name]) => ({ method,
    id: createNode(root, { type: 'experiment_group', parentId: methods.get(method), name }).id }));

  const twinRunIds = [];
  let added = 0;
  for (const group of groups) {
    for (let index = 0; index < 7; index++) {
      const failed = index === 6;
      const metric = group.method === 'AuditFuture30' && index < 2
        ? 0.62 : Number((0.601 + added * 0.001).toFixed(4));
      const id = await addRun(root, group.id, group.method, index, metric, failed);
      if (group.method === 'AuditFuture30' && index < 2) twinRunIds.push(id);
      added++;
    }
  }

  const quote = 'On AF-demo, AuditFuture30 achieved AUPRC 0.6200 in the twin setting.';
  const content = `# Ambiguous result\n\n${quote}\n`;
  writeFileSync(marker, content);
  const ambiguousDocumentId = randomUUID();
  const ambiguousClaimId = randomUUID();
  const time = new Date().toISOString();
  const { db: insert } = openProjectDatabase(root);
  try {
    insert.exec('BEGIN IMMEDIATE');
    try {
      insert.prepare(`INSERT INTO documents (id,path,type,content_hash,parsed_at,parser_version)
        VALUES (?,?,?,?,?,?)`).run(ambiguousDocumentId, marker, 'md', hash(content), time, 'fixture-v1');
      insert.prepare(`INSERT INTO claims (id,document_id,claim_type,original_text,normalized_json,
        source_location_json,parse_model,parse_version,status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,'fixture','v1','unmatched',?,?)`).run(ambiguousClaimId,
          ambiguousDocumentId, 'result_comparison', quote,
          JSON.stringify({ metric: 'AUPRC', target_method: 'AuditFuture30',
            target_value: 0.62, dataset: 'AF-demo' }),
          JSON.stringify({ format: 'md', lineStart: 3, lineEnd: 3,
            quoteHash: hash(quote) }), time, time);
      insert.exec('COMMIT');
    } catch (error) { insert.exec('ROLLBACK'); throw error; }
  } finally { insert.close(); }
  return { ...audit, ambiguousDocumentId, ambiguousClaimId, twinRunIds,
    extraRunCount: added, existing: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), 'project');
  console.log(JSON.stringify(await seedFullScenario(root), null, 2));
}
