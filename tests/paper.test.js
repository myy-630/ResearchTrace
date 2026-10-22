import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { initializeProject } from '../src/host/project/project-service.js';
import { parsePaper } from '../src/host/paper/parsers.js';
import { validateExtractedClaims } from '../src/host/paper/claims.js';
import { listClaims, listDocuments, parseAndStoreDocument } from '../src/host/paper/document-service.js';
import { extractClaimsWithHarness } from '../src/host/paper/extract.js';

const fixture = new URL('../fixtures/demo-research-project/paper/', import.meta.url).pathname;

function claimsFor(segments) {
  const source = (part) => segments.find((segment) => segment.text.includes(part));
  return [
    { segment_id: source('improved AUPRC').id, claim_type: 'result_comparison',
      original_text: 'Future30 improved AUPRC from 0.5490 with Recon-only to 0.5614',
      normalized: { metric: 'AUPRC', baseline_method: 'Recon-only', baseline_value: 0.5490,
        target_method: 'Future30', target_value: 0.5614 } },
    { segment_id: source('learning rate').id, claim_type: 'experiment_setting',
      original_text: 'learning rate 1e-4',
      normalized: { parameters: [{ name: 'learning_rate', value: 0.0001, scope: 'Future30' }] } },
    { segment_id: source('split by patient').id, claim_type: 'data',
      original_text: 'AF-demo was split by patient into training and test sets',
      normalized: { dataset: 'AF-demo', split_strategy: 'patient-level' } },
    { segment_id: source('random seeds').id, claim_type: 'statistical',
      original_text: 'Across 5 random seeds, Future30 achieved mean AUPRC 0.5580 with standard deviation 0.0030',
      normalized: { metric: 'AUPRC', method: 'Future30', repetitions: 5, mean: 0.5580, std: 0.0030 } },
  ];
}

test('Markdown, LaTeX and Word parsers retain precise source locations and four extractable claim classes', () => {
  for (const type of ['md', 'tex', 'docx']) {
    const path = join(fixture, `claims.${type}`);
    const parsed = parsePaper(path, readFileSync(path));
    assert.equal(parsed.type, type);
    const claims = validateExtractedClaims(claimsFor(parsed.segments), parsed.segments);
    assert.deepEqual(claims.map((claim) => claim.claimType),
      ['result_comparison', 'experiment_setting', 'data', 'statistical']);
    assert.ok(claims.every((claim) => claim.sourceLocation.anchor && claim.sourceLocation.quoteHash));
    if (type === 'md') assert.equal(claims[0].sourceLocation.lineStart, 5);
    if (type === 'tex') assert.equal(claims[0].sourceLocation.section, 'Results');
    if (type === 'docx') {
      assert.equal(claims[0].sourceLocation.heading, 'AF Prediction / Results');
      const cell = parsed.segments.find((segment) => segment.text === '0.5614');
      assert.deepEqual(cell.location.table, { index: 1, row: 2, column: 2 });
      const row = parsed.segments.find((segment) => segment.id === 'docx-table-1-row-2');
      assert.equal(row.text, 'Method: Future30; AUPRC: 0.5614');
      assert.deepEqual(row.location.table, { index: 1, row: 2, columns: [1, 2] });
      assert.match(parsed.warnings[0], /charts/);
    }
  }
});

test('claim schema rejects hallucinated quotes and malformed normalized data', () => {
  const parsed = parsePaper(join(fixture, 'claims.md'), readFileSync(join(fixture, 'claims.md')));
  const valid = claimsFor(parsed.segments);
  assert.throws(() => validateExtractedClaims([{ ...valid[0], original_text: 'not in source' }], parsed.segments), /absent/);
  assert.throws(() => validateExtractedClaims([{ ...valid[0], normalized: { metric: 'AUPRC', target_value: '0.5614' } }], parsed.segments), /numeric/);
  assert.throws(() => validateExtractedClaims([{ ...valid[2], claim_type: 'unknown' }], parsed.segments), /Invalid claim/);
});

test('document registry uses content hash cache and reparses changed claims with stable document id', async () => {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-paper-'));
  try {
    initializeProject(root);
    const path = join(root, 'draft.md');
    writeFileSync(path, '# Results\n\nFuture30 AUPRC was 0.5614.\n');
    let calls = 0;
    const extractor = async (segments) => {
      calls += 1;
      return { model: 'test/fixture', version: 'test-v1', claims: [{ segment_id: segments[0].id,
        claim_type: 'result_comparison', original_text: segments[0].text,
        normalized: { metric: 'AUPRC', target_method: 'Future30',
          target_value: Number(segments[0].text.match(/0\.\d+/)?.[0]) } }] };
    };
    const first = await parseAndStoreDocument(root, 'draft.md', extractor);
    assert.equal(first.cached, false);
    assert.equal(first.claims[0].sourceLocation.lineStart, 3);
    const cached = await parseAndStoreDocument(root, 'draft.md', extractor);
    assert.equal(cached.cached, true);
    assert.equal(calls, 1);
    writeFileSync(path, '# Results\n\nFuture30 AUPRC was 0.5714.\n');
    const changed = await parseAndStoreDocument(root, 'draft.md', extractor);
    assert.equal(changed.document.id, first.document.id);
    assert.notEqual(changed.document.contentHash, first.document.contentHash);
    assert.notEqual(changed.claims[0].id, first.claims[0].id);
    assert.equal(changed.claims[0].normalized.target_value, 0.5714);
    assert.equal(calls, 2);
    assert.equal(listClaims(root, first.document.id).length, 1);
    assert.equal(listDocuments(root)[0].claimCount, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('claim extractor calls the routed Harness LLM and requires a successful terminal chunk', async () => {
  const parsed = parsePaper(join(fixture, 'claims.md'), readFileSync(join(fixture, 'claims.md')));
  const payload = JSON.stringify({ claims: claimsFor(parsed.segments) });
  let options;
  const ctx = { llm: { async *stream(input) {
    options = input;
    yield { type: 'block-end', index: 0, block: { type: 'text', text: payload } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  } } };
  const exec = { agent: { session: { id: 'fixture-session', requestHeader: () =>
    ({ config: { provider: 'fixture', model: 'test-model' } }) } }, signal: new AbortController().signal };
  const output = await extractClaimsWithHarness(ctx, exec, parsed.segments);
  assert.equal(output.claims.length, 4);
  assert.equal(output.model, 'fixture/test-model');
  assert.equal(options.provider, 'fixture');
  assert.equal(options.reasoningEffort, 'off');
  assert.match(options.messages[0].content[0].text, /SOURCE SEGMENTS/);
});
