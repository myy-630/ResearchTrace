import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { seedFullScenario } from '../fixtures/full-scenario/setup.mjs';
import { openProjectDatabase } from '../src/host/project/project-service.js';
import { getNodeDetail, getTree } from '../src/host/tree/tree-service.js';
import { listDocuments, parseAndStoreDocument } from '../src/host/paper/document-service.js';
import { traceClaim } from '../src/host/trace/trace-service.js';
import { runAudit } from '../src/host/audit/audit-service.js';

test('full fixture is local and repeatable with 27 runs, all paper formats and ambiguous evidence', async () => {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-full-'));
  try {
    const seeded = await seedFullScenario(root);
    assert.equal(seeded.extraRunCount, 21);
    const tree = getTree(root);
    assert.deepEqual(['research_question', 'method', 'experiment_group', 'run']
      .map((type) => tree.nodes.filter((node) => node.type === type).length), [1, 4, 7, 27]);
    assert.equal(tree.nodes.filter((node) => node.type === 'method' && node.status === 'archived').length, 1);
    assert.equal(tree.nodes.find((node) => node.id === seeded.runIds.future).executionStatus, 'succeeded');
    assert.equal(tree.nodes.filter((node) => node.type === 'run' &&
      node.executionStatus === 'failed').length, 3);
    const { db } = openProjectDatabase(root);
    try {
      assert.equal(db.prepare("SELECT count(*) AS count FROM run_details WHERE execution_status = 'failed'").get().count, 3);
    } finally { db.close(); }
    for (const file of ['paper/incorrect.md', 'paper/ambiguous.md', 'paper/claims.md', 'paper/claims.tex',
      'paper/claims.docx', 'train.mjs']) assert.equal(existsSync(join(root, file)), true, file);
    assert.equal(listDocuments(root).length, 2);
    for (const type of ['md', 'tex', 'docx']) {
      const parsed = await parseAndStoreDocument(root, `paper/claims.${type}`, async (segments) => {
        const segment = segments.find((item) => item.text.includes('Future30 improved AUPRC'));
        return { model: 'fixture', version: 'v1', claims: [{ segment_id: segment.id,
          claim_type: 'result_comparison',
          original_text: 'Future30 improved AUPRC from 0.5490 with Recon-only to 0.5614',
          normalized: { metric: 'AUPRC', target_method: 'Future30', target_value: 0.5614,
            dataset: 'AF-demo' } }] };
      });
      const trace = await traceClaim(root, parsed.claims[0].id);
      assert.equal(trace.claim.status, 'matched', type);
      assert.equal(trace.confirmedRunId, seeded.runIds.future, type);
      assert.equal(trace.evidenceChain.paper.location.format, type);
    }
    const runNode = tree.nodes.find((node) => node.id === seeded.runIds.future);
    const groupNode = tree.nodes.find((node) => node.id === runNode.parentId);
    const methodDetail = getNodeDetail(root, groupNode.parentId);
    assert.equal(methodDetail.relatedClaims.length >= 3, true);
    assert.equal(methodDetail.relatedClaims.every((claim) => claim.documentPath && claim.originalText), true);
    const traced = await traceClaim(root, seeded.ambiguousClaimId);
    assert.equal(traced.claim.status, 'ambiguous');
    assert.equal(traced.confirmedRunId, null);
    assert.deepEqual(new Set(traced.candidates.slice(0, 2).map((item) => item.runId)),
      new Set(seeded.twinRunIds));
    const audit = runAudit(root, seeded.documentId);
    assert.deepEqual(audit.counts, { error: 5, warning: 2, info: 0 });
    const repeated = await seedFullScenario(root);
    assert.equal(repeated.existing, true);
    assert.equal(getTree(root).nodes.length, tree.nodes.length);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
