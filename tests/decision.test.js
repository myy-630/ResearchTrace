import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { initializeProject } from '../src/host/project/project-service.js';
import { createNode, getNodeDetail } from '../src/host/tree/tree-service.js';
import { createRun, finishRun, markRunRunning } from '../src/host/experiment/run-repository.js';
import { listDecisions, recordDecision, searchResearch } from '../src/host/decision/decision-service.js';

async function scenario() {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-decisions-'));
  initializeProject(root);
  const q = createNode(root, { type: 'research_question', name: 'AF prediction' });
  const recon = createNode(root, { type: 'method', parentId: q.id, name: 'Recon-only' });
  const joint = createNode(root, { type: 'method', parentId: q.id, name: 'Joint Training' });
  const group = createNode(root, { type: 'experiment_group', parentId: joint.id, name: 'Baseline seeds' });
  const run = createRun(root, { intent: 'Compare Joint Training', methodName: 'Joint Training',
    groupId: group.id, command: 'echo fixture', runName: 'Joint seed 7' });
  markRunRunning(root, run.id);
  writeFileSync(join(root, 'metrics.json'), JSON.stringify({ auprc: 0.5614 }));
  await finishRun(root, run.id, { exitCode: 0, metricsPath: 'metrics.json' });
  return { root, q, recon, joint, group, run };
}

test('archive decision persists source text, reason and key run evidence; default search excludes descendants', async () => {
  const { root, recon, joint, run } = await scenario();
  try {
    const raw = 'Joint Training 一直低于 Recon-only，这条方法不做了，归档';
    const saved = recordDecision(root, { nodeId: joint.id, type: 'archive', rawUserText: raw,
      summary: 'Joint Training 不再作为当前路线', reason: '表现低于 Recon-only',
      reopenCondition: '若换数据划分再评估', relatedRunIds: [run.id] });
    assert.equal(saved.nodeStatus, 'archived');
    assert.equal(saved.decision.rawUserText, raw);
    assert.equal(saved.decision.relatedRuns[0].metrics.auprc, 0.5614);
    assert.equal(listDecisions(root, joint.id)[0].reopenCondition, '若换数据划分再评估');
    assert.equal(getNodeDetail(root, joint.id).decisions[0].id, saved.decision.id);
    const current = searchResearch(root, '目前最好的路线有哪些？');
    assert.ok(current.results.some((item) => item.id === recon.id));
    assert.ok(!current.results.some((item) => item.id === joint.id || item.id === run.id));
    const why = searchResearch(root, '当时为什么放弃 Joint Training？');
    assert.equal(why.exactNameHistoryOverride, true);
    assert.equal(why.results.find((item) => item.id === joint.id).decisions[0].keyRuns[0].id, run.id);
    const history = searchResearch(root, '把 Joint Training 的历史实验找出来');
    assert.ok(history.results.some((item) => item.id === run.id));
    assert.ok(searchResearch(root, '历史实验', { include_archived: true }).results.some((item) => item.id === run.id));
    recordDecision(root, { nodeId: joint.id, type: 'reopen', rawUserText: '重新开启 Joint Training',
      summary: '重新评估 Joint Training' });
    assert.ok(searchResearch(root, '目前最好的路线有哪些？').results.some((item) => item.id === joint.id));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('decision summary rejects unsupported numbers and rejects invalid key run links', async () => {
  const { root, joint, run } = await scenario();
  try {
    assert.throws(() => recordDecision(root, { nodeId: joint.id, type: 'archive',
      rawUserText: '归档', summary: 'AUPRC 0.9999', relatedRunIds: [run.id] }), /unsupported numeric/);
    assert.throws(() => recordDecision(root, { nodeId: joint.id, type: 'archive',
      rawUserText: '归档', summary: '重复了 99 次', relatedRunIds: [run.id] }), /unsupported numeric/);
    assert.throws(() => recordDecision(root, { nodeId: joint.id, type: 'archive',
      rawUserText: '归档', summary: '归档', relatedRunIds: ['missing'] }), /Related run not found/);
    assert.equal(listDecisions(root, joint.id).length, 0);
    recordDecision(root, { nodeId: joint.id, type: 'archive', rawUserText: 'AUPRC 0.5614，归档',
      summary: 'AUPRC 0.5614，归档', relatedRunIds: [run.id] });
    assert.equal(listDecisions(root, joint.id).length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('rejected routes obey the separate include_rejected filter', async () => {
  const { root, joint } = await scenario();
  try {
    recordDecision(root, { nodeId: joint.id, type: 'reject', rawUserText: '否决 Joint Training',
      summary: '否决 Joint Training' });
    assert.ok(!searchResearch(root, '目前方法').results.some((item) => item.id === joint.id));
    assert.ok(searchResearch(root, '目前方法', { include_rejected: true }).results.some((item) => item.id === joint.id));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
