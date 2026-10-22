import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeProject, openProjectDatabase } from '../src/host/project/project-service.js';
import { createRun, finishRun, markRunRunning } from '../src/host/experiment/run-repository.js';
import { getTree, setNodeStatus } from '../src/host/tree/tree-service.js';
import { confirmClaimLink, getClaimTrace, traceClaim } from '../src/host/trace/trace-service.js';
import { decimalTolerance, evaluateCandidate, numericMatch } from '../src/host/trace/matching.js';
import { rankMethodSemantics } from '../src/host/trace/semantic.js';

function project() {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-trace-'));
  initializeProject(root);
  return root;
}

async function addRun(root, name, metric, config = {}, dataset = { name: 'AF-demo', strategy: 'patient-level' }) {
  const run = createRun(root, { intent: `test ${name}`, command: 'echo fixture', methodName: name,
    runName: `${name} seed 7`, configValues: { method: name, learning_rate: 0.0001,
      history_window: 20, future_window: 30, ...config }, seed: 7 });
  markRunRunning(root, run.id);
  await finishRun(root, run.id, { exitCode: 0 });
  const { db } = openProjectDatabase(root);
  try { db.prepare(`UPDATE run_details SET metrics_json = ?, metrics_status = 'collected',
    dataset_json = ? WHERE node_id = ?`).run(JSON.stringify({ auprc: metric }), JSON.stringify(dataset), run.id); }
  finally { db.close(); }
  return run.id;
}

function addClaim(root, type, normalized, quote = 'Future30 AUPRC = 0.5614') {
  const { db } = openProjectDatabase(root);
  try {
    const documentId = randomUUID();
    const claimId = randomUUID();
    db.prepare(`INSERT INTO documents (id,path,type,content_hash,parsed_at) VALUES (?,?,?,?,?)`)
      .run(documentId, join(root, `${documentId}.md`), 'md', 'fixture-hash', new Date().toISOString());
    db.prepare(`INSERT INTO claims (id,document_id,claim_type,original_text,normalized_json,
      source_location_json,status,created_at,updated_at) VALUES (?,?,?,?,? ,?,'unmatched',?,?)`)
      .run(claimId, documentId, type, quote, JSON.stringify(normalized),
        JSON.stringify({ format: 'md', lineStart: 3, segmentId: 'md-1' }),
        new Date().toISOString(), new Date().toISOString());
    return claimId;
  } finally { db.close(); }
}

test('exact and rounded numeric matches return a full evidence chain', async () => {
  const root = project();
  try {
    const runId = await addRun(root, 'Future30', 0.5614);
    const claimId = addClaim(root, 'result_comparison', { metric: 'AUPRC', target_method: 'Future30',
      target_value: 0.5614, dataset: 'AF-demo' });
    const exact = await traceClaim(root, claimId);
    assert.equal(exact.claim.status, 'matched');
    assert.equal(exact.confirmedRunId, runId);
    assert.equal(exact.candidates[0].numeric.kind, 'exact');
    assert.equal(exact.evidenceChain.result.recordedValue, 0.5614);
    assert.equal(exact.evidenceChain.config.values.learning_rate, 0.0001);
    assert.equal(exact.evidenceChain.paper.location.lineStart, 3);
    assert.equal(getClaimTrace(root, claimId).confirmedRunId, runId);
    assert.equal(numericMatch(0.56143, 0.5614, 'AUPRC = 0.5614').kind, 'rounded');
    assert.equal(numericMatch(0.56149, 0.5614, 'AUPRC = 0.5614').kind, 'mismatch');
    assert.equal(decimalTolerance('AUPRC = 0.5614', 0.5614), 0.00005);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('archived descendants are excluded unless historical retrieval is explicit', async () => {
  const root = project();
  try {
    const runId = await addRun(root, 'Future30', 0.5614);
    const claimId = addClaim(root, 'result_comparison', { metric: 'AUPRC', target_method: 'Future30',
      target_value: 0.5614 });
    const method = getTree(root).nodes.find((node) => node.type === 'method' && node.name === 'Future30');
    setNodeStatus(root, method.id, 'archived');
    assert.equal((await traceClaim(root, claimId)).candidates.length, 0);
    assert.equal((await traceClaim(root, claimId, { includeArchived: true })).confirmedRunId, runId);
    assert.equal((await traceClaim(root, claimId)).confirmedExcludedByDefault, true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a rounded paper value resolves to the stored higher precision metric', async () => {
  const root = project();
  try {
    const runId = await addRun(root, 'Future30', 0.56143);
    const claimId = addClaim(root, 'result_comparison', { metric: 'AUPRC', target_method: 'Future30',
      target_value: 0.5614 }, 'Future30 AUPRC = 0.5614');
    const result = await traceClaim(root, claimId);
    assert.equal(result.confirmedRunId, runId);
    assert.equal(result.candidates[0].numeric.kind, 'rounded');
    assert.match(result.candidates[0].reasons.join(' '), /rounds consistently/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('configuration similarity distinguishes candidates and records contradictions', async () => {
  const root = project();
  try {
    const first = await addRun(root, 'Future30', 0.5614, { learning_rate: 0.0001 });
    await addRun(root, 'Other30', 0.5614, { learning_rate: 0.001 });
    const claimId = addClaim(root, 'experiment_setting', {
      parameters: [{ name: 'learning rate', value: 0.0001, scope: 'Future30' }] },
    'Future30 learning rate 1e-4');
    const result = await traceClaim(root, claimId);
    assert.equal(result.confirmedRunId, first);
    assert.ok(result.candidates[0].score > result.candidates[1].score);
    assert.match(result.candidates[1].contradictions.join(' '), /learning rate/);
    const candidate = { id: 'x', name: 'x', methodNames: ['Future30'], metrics: {},
      config: { history_window: 20 }, dataset: null, seed: 7, git: null, lineage: [], status: 'succeeded' };
    const scored = evaluateCandidate({ type: 'experiment_setting', originalText: '', normalized: {
      parameters: [{ name: 'history window', value: '20-second', scope: 'Future30' }] } }, candidate);
    assert.match(scored.reasons.join(' '), /matches config/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('equal candidates remain ambiguous until a user-selected link is confirmed durably', async () => {
  const root = project();
  try {
    const a = await addRun(root, 'Future30', 0.5614);
    const b = await addRun(root, 'Future30', 0.5614);
    const claimId = addClaim(root, 'result_comparison', { metric: 'AUPRC', target_method: 'Future30',
      target_value: 0.5614 });
    const trace = await traceClaim(root, claimId);
    assert.equal(trace.claim.status, 'ambiguous');
    assert.equal(trace.confirmedRunId, null);
    assert.equal(trace.links.filter((link) => link.status === 'candidate').length, 2);
    assert.throws(() => confirmClaimLink(root, claimId, 'unknown'), /eligible/);
    const confirmed = confirmClaimLink(root, claimId, b);
    assert.equal(confirmed.confirmedRunId, b);
    assert.equal(confirmed.links.filter((link) => link.status === 'confirmed').length, 1);
    assert.equal(getClaimTrace(root, claimId).confirmedRunId, b);
    assert.equal((await traceClaim(root, claimId)).confirmedRunId, b);
    assert.notEqual(a, b);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('semantic fallback accepts only listed run ids and cannot override numeric facts', async () => {
  const claim = { originalText: 'future window prediction has AUPRC 0.5614',
    normalized: { target_method: 'future window prediction' } };
  const candidates = [{ runId: 'run-1', name: 'F30', lineage: [{ type: 'method', name: 'F30' }] }];
  const ctx = { llm: { async *stream(input) {
    assert.equal(input.reasoningEffort, 'off');
    yield { type: 'block-end', block: { type: 'text', text: JSON.stringify({ rankings: [
      { runId: 'run-1', similarity: 0.9, reason: 'same future horizon' },
      { runId: 'invented', similarity: 1, reason: 'invalid' },
    ] }) } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  } } };
  const exec = { agent: { session: { id: 'test', requestHeader: () => ({ config: {
    provider: 'fixture', model: 'test' } }) } } };
  assert.deepEqual(await rankMethodSemantics(ctx, exec, claim, candidates), [
    { runId: 'run-1', similarity: 0.9, reason: 'same future horizon' },
  ]);
});
