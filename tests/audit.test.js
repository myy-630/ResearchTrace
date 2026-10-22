import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { seedAuditScenario } from '../fixtures/audit-scenario/setup.mjs';
import { getAuditReport, listAuditReports, runAudit } from '../src/host/audit/audit-service.js';
import { openProjectDatabase } from '../src/host/project/project-service.js';
import { traceClaim } from '../src/host/trace/trace-service.js';

test('golden incorrect paper finds exactly the deterministic A/B/C/D/F/G/H errors and warnings', async () => {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-audit-'));
  try {
    const fixture = await seedAuditScenario(root);
    const report = runAudit(root, fixture.documentId);
    const actual = report.findings.map((item) => [item.ruleId, item.severity]);
    const expected = [
      ['RESULT_MISMATCH', 'error'],
      ['INCOMPARABLE_PROTOCOL', 'error'],
      ['DIRTY_GIT_RISK', 'warning'],
      ['PARAMETER_MISMATCH', 'error'],
      ['SPLIT_MISMATCH', 'error'],
      ['MEAN_MISMATCH', 'error'],
      ['ARCHIVED_EVIDENCE', 'warning'],
    ];
    assert.deepEqual(actual.sort(), expected.sort());
    assert.deepEqual(report.counts, { error: 5, warning: 2, info: 0 });
    assert.equal(report.findings.every((item) => item.claimId && item.runId &&
      item.paperEvidence.quote && item.experimentEvidence && item.recommendation), true);
    assert.equal(report.findings.find((item) => item.ruleId === 'INCOMPARABLE_PROTOCOL')
      .experimentEvidence.baselineRunId, fixture.runIds.recon);
    assert.ok(Math.abs(report.findings.find((item) => item.ruleId === 'MEAN_MISMATCH')
      .experimentEvidence.sampleStd - 0.01) < 1e-12);
    assert.ok(existsSync(report.exportPaths.json));
    assert.ok(existsSync(report.exportPaths.markdown));
    assert.equal(JSON.parse(readFileSync(report.exportPaths.json)).findings.length, expected.length);
    assert.match(readFileSync(report.exportPaths.markdown, 'utf8'), /RESULT_MISMATCH/);
    assert.deepEqual(getAuditReport(root, report.id).findings.map((item) => item.ruleId),
      report.findings.map((item) => item.ruleId));
    assert.equal(listAuditReports(root, fixture.documentId)[0].id, report.id);
    assert.deepEqual(runAudit(root, fixture.documentId).findings.map((item) => item.ruleId),
      report.findings.map((item) => item.ruleId));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a unique conflicting trace emits a numeric finding without silently confirming the run', async () => {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-audit-conflict-'));
  try {
    const fixture = await seedAuditScenario(root);
    const { db } = openProjectDatabase(root);
    try {
      db.prepare('DELETE FROM claim_run_links WHERE claim_id = ?').run(fixture.claimIds[0]);
      db.prepare(`UPDATE claims SET status = 'unmatched' WHERE id = ?`).run(fixture.claimIds[0]);
    } finally { db.close(); }
    const trace = await traceClaim(root, fixture.claimIds[0]);
    assert.equal(trace.claim.status, 'conflict');
    assert.equal(trace.confirmedRunId, null);
    const report = runAudit(root, fixture.documentId);
    const ids = report.findings.filter((item) => item.claimId === fixture.claimIds[0])
      .map((item) => item.ruleId);
    assert.deepEqual(ids, ['RESULT_MISMATCH', 'TRACE_INCOMPLETE']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing confirmation and incomplete provenance yield warnings, not invented numeric errors', async () => {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-audit-missing-'));
  try {
    const fixture = await seedAuditScenario(root);
    const { db } = openProjectDatabase(root);
    try {
      db.prepare('DELETE FROM claim_run_links WHERE claim_id = ?').run(fixture.claimIds[0]);
      db.prepare(`UPDATE claims SET status = 'unmatched' WHERE id = ?`).run(fixture.claimIds[0]);
    } finally { db.close(); }
    const report = runAudit(root, fixture.documentId);
    const first = report.findings.filter((item) => item.claimId === fixture.claimIds[0]);
    assert.deepEqual(first.map((item) => [item.ruleId, item.severity]), [['TRACE_INCOMPLETE', 'warning']]);
    assert.equal(first.some((item) => item.ruleId === 'RESULT_MISMATCH'), false);
    const { db: update } = openProjectDatabase(root);
    try {
      update.prepare(`INSERT INTO claim_run_links (id,claim_id,run_node_id,status,confidence,reasons_json,created_at)
        VALUES ('restored-link',?,?,'confirmed',1,'[]',?)`).run(fixture.claimIds[0],
        fixture.runIds.future, new Date().toISOString());
      update.prepare(`UPDATE claims SET status = 'matched' WHERE id = ?`).run(fixture.claimIds[0]);
      update.prepare(`UPDATE run_details SET config_json = NULL, config_hash = NULL, git_commit = NULL,
        dataset_json = NULL WHERE node_id = ?`).run(fixture.runIds.future);
    } finally { update.close(); }
    const incomplete = runAudit(root, fixture.documentId);
    const evidence = incomplete.findings.find((item) => item.ruleId === 'TRACE_INCOMPLETE' &&
      item.claimId === fixture.claimIds[0]);
    assert.deepEqual(evidence.experimentEvidence.missing, ['config', 'Git commit', 'dataset/split']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('an unlinked multi-seed statistic is reported as incomplete evidence', async () => {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-audit-statistic-'));
  try {
    const fixture = await seedAuditScenario(root);
    const statisticalClaimId = fixture.claimIds[3];
    const { db } = openProjectDatabase(root);
    try {
      db.prepare('DELETE FROM claim_run_links WHERE claim_id = ?').run(statisticalClaimId);
      db.prepare("UPDATE claims SET status = 'unmatched' WHERE id = ?").run(statisticalClaimId);
    } finally { db.close(); }
    const report = runAudit(root, fixture.documentId);
    const items = report.findings.filter((item) => item.claimId === statisticalClaimId);
    assert.deepEqual(items.map((item) => [item.ruleId, item.severity]),
      [['TRACE_INCOMPLETE', 'warning']]);
    assert.equal(items[0].experimentEvidence.reportedRepetitions, 3);
    assert.equal(items.some((item) => item.ruleId === 'MEAN_MISMATCH'), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
