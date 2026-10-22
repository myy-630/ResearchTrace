import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import test from 'node:test';
import { initializeProject } from '../src/host/project/project-service.js';
import { captureGit } from '../src/host/experiment/git.js';
import { configPathFromCommand, loadConfig, parseConfigText } from '../src/host/experiment/config.js';
import { loadMetrics, parseMetricsText } from '../src/host/experiment/metrics.js';
import { describeAsset } from '../src/host/experiment/assets.js';
import { createRun, finishRun, getRunDetail, markRunRunning, recoverInterruptedRuns } from '../src/host/experiment/run-repository.js';
import { executeExperiment } from '../src/host/tools/experiment-tool.js';

const fixture = new URL('../fixtures/demo-research-project/', import.meta.url).pathname;
const command = 'node train.mjs --config fixtures/configs/future30.yaml --output results/future30/metrics.json --delay-ms 0';
const input = { intent: '跑一下 Future30，使用 fixtures/configs/future30.yaml。', methodName: 'Future30',
  groupName: 'Baseline seeds', command, configPath: 'fixtures/configs/future30.yaml',
  metricsPath: 'results/future30/metrics.json', assetPaths: ['results/future30/checkpoint.pt'] };

function workspace() {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-m2-'));
  cpSync(fixture, root, { recursive: true, filter: (source) => {
    const parts = relative(fixture, source).split(sep);
    return !parts.includes('.researchtrace') && !parts.includes('results');
  } });
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'add', '.']);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@local.invalid',
    'commit', '-qm', 'fixture']);
  initializeProject(root);
  return root;
}

test('successful run is recorded before execution and retains metrics, Git, config and assets', async () => {
  const root = workspace();
  try {
    const created = createRun(root, input);
    assert.equal(getRunDetail(root, created.id).status, 'created');
    markRunRunning(root, created.id);
    assert.equal(getRunDetail(root, created.id).status, 'running');
    const run = spawnSync(process.execPath, ['train.mjs', '--config', 'fixtures/configs/future30.yaml',
      '--output', 'results/future30/metrics.json', '--delay-ms', '0'], { cwd: root, encoding: 'utf8' });
    const detail = await finishRun(root, created.id, { exitCode: run.status, stdout: run.stdout,
      stderr: run.stderr, metricsPath: input.metricsPath });
    assert.equal(detail.status, 'succeeded');
    assert.equal(detail.metrics.auprc, 0.5614);
    assert.equal(detail.git.dirty, false);
    assert.match(detail.git.commit, /^[0-9a-f]{40}$/);
    assert.equal(detail.config.values.learning_rate, 0.0001);
    assert.equal(detail.config.source, 'explicit');
    assert.equal(detail.dataset.strategy, 'patient-level');
    assert.match(detail.dataset.splitHash, /^[0-9a-f]{64}$/);
    assert.deepEqual(detail.assets.map((asset) => asset.type).sort(), ['checkpoint', 'config', 'log', 'metrics']);
    assert.ok(detail.assets.every((asset) => asset.contentHash));
    assert.equal(getRunDetail(root, created.id).status, 'succeeded');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('failed and cancelled runs remain durable, and lingering running runs recover as interrupted', async () => {
  const root = workspace();
  try {
    const failed = createRun(root, { ...input, command: `${command} --fail`, runName: 'Failure' });
    markRunRunning(root, failed.id);
    const trained = spawnSync(process.execPath, ['train.mjs', '--config', 'fixtures/configs/future30.yaml',
      '--delay-ms', '0', '--fail'], { cwd: root, encoding: 'utf8' });
    const failedDetail = await finishRun(root, failed.id, { exitCode: trained.status,
      stdout: trained.stdout, stderr: trained.stderr });
    assert.equal(failedDetail.status, 'failed');
    assert.equal(failedDetail.exitCode, 2);
    assert.match(failedDetail.errorMessage, /Fixture training failed/);
    assert.ok(failedDetail.assets.some((asset) => asset.type === 'log'));
    const cancelled = createRun(root, { ...input, runName: 'Cancelled' });
    markRunRunning(root, cancelled.id);
    assert.equal((await finishRun(root, cancelled.id, { exitCode: null, cancelled: true })).status, 'cancelled');
    const interrupted = createRun(root, { ...input, runName: 'Interrupted' });
    markRunRunning(root, interrupted.id);
    assert.equal(recoverInterruptedRuns(root), 1);
    assert.equal(getRunDetail(root, interrupted.id).status, 'interrupted');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('Git capture distinguishes clean and dirty workspaces without reading plugin metadata', () => {
  const root = workspace();
  try {
    assert.equal(captureGit(root).dirty, false);
    writeFileSync(join(root, 'train.mjs'), `${readFileSync(join(root, 'train.mjs'), 'utf8')}\n// change\n`);
    const dirty = captureGit(root);
    assert.equal(dirty.dirty, true);
    assert.match(dirty.diffHash, /^[0-9a-f]{64}$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('YAML/JSON config and JSON/CSV metrics parse deterministically and redact secrets', () => {
  const root = workspace();
  try {
    assert.equal(configPathFromCommand(command), 'fixtures/configs/future30.yaml');
    assert.equal(loadConfig(root, null, command).values.future_window, 30);
    assert.equal(loadConfig(root, null, 'node train.mjs --learning-rate 0.001 --seed 12').values.learning_rate, 0.001);
    writeFileSync(join(root, '.researchtrace', 'project.yaml'), 'experiment:\n  config_path: fixtures/configs/future30.yaml\n');
    assert.equal(loadConfig(root, null, 'node train.mjs').source, 'project-rule');
    assert.equal(parseConfigText('{"nested":{"api_key":"hidden"}}', '.json').nested.api_key, '[REDACTED]');
    assert.equal(parseMetricsText('metric,value\nauprc,0.5614\nloss,0.2\n', '.csv').auprc, 0.5614);
    assert.equal(parseMetricsText('{"metrics":{"auprc":0.5614}}', '.json').auprc, 0.5614);
    assert.equal(loadMetrics(root, 'fixtures/splits/patients.csv').values.patient_id, undefined);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('asset hashing records small files and skips oversized content', async () => {
  const root = workspace();
  try {
    const asset = await describeAsset(root, 'fixtures/configs/future30.yaml', 'config');
    assert.equal(asset.type, 'config');
    assert.match(asset.contentHash, /^[0-9a-f]{64}$/);
    assert.ok(asset.size > 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('composite experiment tool invokes Harness bash after recording a running run', async () => {
  const root = workspace();
  try {
    const calls = [];
    const ctx = { tools: { async execute(call) {
      calls.push(call);
      const db = new (await import('node:sqlite')).DatabaseSync(join(root, '.researchtrace', 'researchtrace.db'));
      try { assert.equal(db.prepare('SELECT execution_status FROM run_details').get().execution_status, 'running'); }
      finally { db.close(); }
      const trained = spawnSync(process.execPath, ['train.mjs', '--config', 'fixtures/configs/future30.yaml',
        '--output', 'results/future30/metrics.json', '--delay-ms', '0'], { cwd: root, encoding: 'utf8' });
      return { isError: false, value: { kind: 'foreground', exitCode: trained.status,
        stdout: { text: trained.stdout }, stderr: { text: trained.stderr }, aborted: false } };
    } } };
    const result = await executeExperiment(ctx, root, input,
      { callId: 'test-call', rootCallId: 'test-call', token: Symbol('test'),
        agent: { id: 'fixture-session' }, signal: new AbortController().signal });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'bash');
    assert.equal(result.status, 'succeeded');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
