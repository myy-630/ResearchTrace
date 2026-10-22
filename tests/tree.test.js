import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { initializeProject } from '../src/host/project/project-service.js';
import { createNode, deleteNode, getNodeDetail, getRetrievableTree, getTree, restoreNode, setNodeStatus,
  setPrimary, updateNode } from '../src/host/tree/tree-service.js';
import { createRun, finishRun, markRunRunning } from '../src/host/experiment/run-repository.js';

function project() {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-tree-'));
  initializeProject(root);
  return root;
}

test('node creation enforces hierarchy and method evolution without cycles', () => {
  const root = project();
  try {
    assert.throws(() => createNode(root, { type: 'method', name: 'No parent' }), /requires a parent/);
    const question = createNode(root, { type: 'research_question', name: 'AF prediction' });
    const route = createNode(root, { type: 'method', parentId: question.id,
      name: 'Future Prediction', motivation: 'Predict future AF' });
    const child = createNode(root, { type: 'method', parentId: route.id, name: 'Future30' });
    const group = createNode(root, { type: 'experiment_group', parentId: child.id, name: 'Seeds' });
    assert.throws(() => createNode(root, { type: 'experiment_group', parentId: question.id, name: 'Bad' }), /cannot be placed/);
    assert.throws(() => updateNode(root, route.id, { parentId: child.id }), /cycle/);
    assert.throws(() => updateNode(root, group.id, { parentId: question.id }), /cannot be placed/);
    assert.equal(getNodeDetail(root, child.id).lineage.map((item) => item.name).join(' / '),
      'AF prediction / Future Prediction / Future30');
    assert.deepEqual(updateNode(root, child.id, { summary: '30-day window', tags: ['primary', 'primary'] }).tags, ['primary']);
    assert.throws(() => deleteNode(root, child.id), /Only empty leaf/);
    assert.equal(deleteNode(root, group.id).deletedId, group.id);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('archive hides all descendants from default retrieval, explicit detail remains and restore reverses it', async () => {
  const root = project();
  try {
    const question = createNode(root, { type: 'research_question', name: 'AF prediction' });
    const recon = createNode(root, { type: 'method', parentId: question.id, name: 'Recon-only' });
    const joint = createNode(root, { type: 'method', parentId: question.id, name: 'Joint Training' });
    const group = createNode(root, { type: 'experiment_group', parentId: joint.id, name: 'Baseline seeds' });
    const run = createRun(root, { intent: 'Compare Joint Training', methodName: 'Joint Training',
      groupName: 'Baseline seeds', command: 'echo fixture', runName: 'run_001' });
    markRunRunning(root, run.id);
    await finishRun(root, run.id, { exitCode: 0, stdout: 'fixture' });
    setNodeStatus(root, joint.id, 'archived');
    let tree = getTree(root);
    assert.equal(tree.nodes.find((node) => node.id === joint.id).defaultVisible, false);
    assert.equal(tree.nodes.find((node) => node.id === group.id).defaultVisible, false);
    assert.equal(tree.nodes.find((node) => node.id === run.id).defaultVisible, false);
    assert.equal(tree.nodes.find((node) => node.id === recon.id).defaultVisible, true);
    assert.equal(getRetrievableTree(root).nodes.some((node) => node.id === joint.id), false);
    assert.equal(getRetrievableTree(root, { includeArchived: true }).nodes.some((node) => node.id === run.id), true);
    assert.equal(getNodeDetail(root, joint.id).runs[0].id, run.id);
    assert.equal(restoreNode(root, joint.id).status, 'active');
    tree = getTree(root);
    assert.equal(tree.nodes.find((node) => node.id === run.id).defaultVisible, true);
    setNodeStatus(root, question.id, 'rejected');
    assert.equal(getTree(root).nodes.find((node) => node.id === recon.id).defaultVisible, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('primary marker is unique among sibling methods and never set on archived methods', () => {
  const root = project();
  try {
    const question = createNode(root, { type: 'research_question', name: 'AF prediction' });
    const recon = createNode(root, { type: 'method', parentId: question.id, name: 'Recon-only' });
    const future = createNode(root, { type: 'method', parentId: question.id, name: 'Future Prediction' });
    const future30 = createNode(root, { type: 'method', parentId: future.id, name: 'Future30' });
    setPrimary(root, recon.id);
    setPrimary(root, future.id);
    setPrimary(root, future30.id);
    const nodes = getTree(root).nodes;
    assert.equal(nodes.find((node) => node.id === recon.id).isPrimary, false);
    assert.equal(nodes.find((node) => node.id === future.id).isPrimary, true);
    assert.equal(nodes.find((node) => node.id === future30.id).isPrimary, true);
    setNodeStatus(root, future.id, 'archived');
    assert.equal(getTree(root).nodes.find((node) => node.id === future.id).isPrimary, false);
    assert.throws(() => setPrimary(root, future.id), /cannot be primary/);
    assert.throws(() => setPrimary(root, future30.id), /under archived/);
    restoreNode(root, future.id);
    updateNode(root, future30.id, { parentId: question.id });
    assert.equal(getTree(root).nodes.find((node) => node.id === future30.id).isPrimary, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
