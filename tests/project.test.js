import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { getProjectState, initializeProject } from '../src/host/project/project-service.js';

function temporaryWorkspace(callback) {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-m1-'));
  try { return callback(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('project initialization creates only local data and is idempotent without Git', () => temporaryWorkspace((root) => {
  writeFileSync(join(root, 'notes.txt'), 'existing research data');
  assert.equal(getProjectState(root).initialized, false);
  const first = initializeProject(root);
  assert.equal(first.initialized, true);
  assert.ok(existsSync(join(root, '.researchtrace', 'researchtrace.db')));
  assert.deepEqual(readdirSync(root).sort(), ['.researchtrace', 'notes.txt']);
  assert.equal(getProjectState(root).project.id, first.project.id);
  assert.equal(initializeProject(root).project.id, first.project.id);
}));

test('project state survives a fresh Node process', () => temporaryWorkspace((root) => {
  const first = initializeProject(root);
  const moduleUrl = new URL('../src/host/project/project-service.js', import.meta.url).href;
  const result = spawnSync(process.execPath, [
    '--input-type=module', '-e',
    `import { getProjectState } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(getProjectState(process.argv[1])));`,
    root,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const restored = JSON.parse(result.stdout);
  assert.equal(restored.project.id, first.project.id);
  assert.equal(restored.project.rootPath, first.project.rootPath);
}));

test('initialization refuses a redirected data directory', () => temporaryWorkspace((root) => {
  const other = mkdtempSync(join(tmpdir(), 'researchtrace-outside-'));
  try {
    symlinkSync(other, join(root, '.researchtrace'));
    assert.throws(() => initializeProject(root), /real directory/);
    assert.deepEqual(readdirSync(other), []);
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
}));
