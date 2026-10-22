import { sha256 } from '../experiment/config.js';

const TYPES = new Set(['result_comparison', 'experiment_setting', 'data', 'statistical']);

function finite(value) { return typeof value === 'number' && Number.isFinite(value); }

function matchQuote(source, quote) {
  const at = source.indexOf(quote);
  if (at >= 0) return { text: quote, offset: at };
  const tokens = quote.trim().split(/\s+/).map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(tokens.join('\\s+'));
  const found = source.match(pattern);
  return found ? { text: found[0], offset: found.index } : null;
}

function validateNormalized(type, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Claim normalized value must be an object');
  if (type === 'result_comparison') {
    if (typeof value.metric !== 'string' || !value.metric.trim() || !finite(value.target_value)) {
      throw new Error('Result claim requires metric and numeric target_value');
    }
    if (value.baseline_value != null && !finite(value.baseline_value)) throw new Error('Invalid baseline_value');
  } else if (type === 'experiment_setting') {
    if (!Array.isArray(value.parameters) || !value.parameters.length ||
      value.parameters.some((item) => !item || typeof item.name !== 'string' || !item.name.trim() || item.value == null)) {
      throw new Error('Setting claim requires named parameters with values');
    }
  } else if (type === 'data') {
    if (typeof value.dataset !== 'string' && typeof value.split_strategy !== 'string' &&
        typeof value.preprocessing !== 'string') throw new Error('Data claim requires dataset, split_strategy, or preprocessing');
  } else if (type === 'statistical') {
    if (!finite(value.mean) && !finite(value.std) && !Number.isInteger(value.repetitions)) {
      throw new Error('Statistical claim requires repetitions, mean, or std');
    }
  }
  return value;
}

function numericTokenPresent(source, value) {
  return (source.match(/(?<![\w.])-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [])
    .some((token) => Math.abs(Number(token) - value) <= 1e-12);
}

export function validateExtractedClaims(rawClaims, segments) {
  if (!Array.isArray(rawClaims) || rawClaims.length > 200) throw new Error('Claim extraction must return an array of at most 200 claims');
  const byId = new Map(segments.map((item) => [item.id, item]));
  const dedupe = new Set();
  const claims = [];
  for (const raw of rawClaims) {
    if (!raw || !TYPES.has(raw.claim_type)) throw new Error(`Invalid claim type: ${raw?.claim_type}`);
    const segment = byId.get(raw.segment_id);
    if (!segment) throw new Error(`Claim cites unknown segment: ${raw.segment_id}`);
    if (typeof raw.original_text !== 'string' || !raw.original_text.trim() || raw.original_text.length > 3000) {
      throw new Error('Claim original_text is required');
    }
    const quote = matchQuote(segment.text, raw.original_text);
    if (!quote) throw new Error(`Claim quote is absent from source segment: ${raw.segment_id}`);
    const normalized = { ...validateNormalized(raw.claim_type, raw.normalized) };
    if (raw.claim_type === 'result_comparison' && Number.isFinite(normalized.delta) &&
        !numericTokenPresent(quote.text, normalized.delta)) normalized.delta = null;
    const key = `${raw.segment_id}:${raw.claim_type}:${sha256(quote.text)}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    claims.push({ claimType: raw.claim_type, originalText: quote.text, normalized,
      sourceLocation: { ...segment.location, segmentId: segment.id,
        quoteOffset: quote.offset, quoteHash: sha256(quote.text) } });
  }
  return claims;
}
