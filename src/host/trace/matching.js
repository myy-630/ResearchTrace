const key = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

export function decimalTolerance(text, value, explicitTolerance = 0) {
  if (finite(explicitTolerance) && explicitTolerance < 0) throw new Error('Tolerance must be nonnegative');
  const tokens = String(text).match(/(?<![\w.])-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? [];
  const matching = tokens.filter((token) => Math.abs(Number(token) - value) < 1e-10);
  const decimals = matching.map((token) => {
    const [mantissa, exponent] = token.toLowerCase().split('e');
    return Math.max(0, (mantissa.split('.')[1]?.length ?? 0) - Number(exponent ?? 0));
  });
  const inferred = decimals.length ? 0.5 * 10 ** -Math.max(...decimals) : 0;
  return Math.max(explicitTolerance || 0, inferred);
}

export function numericMatch(actual, expected, sourceText, tolerance = 0) {
  if (!finite(actual) || !finite(expected)) return { kind: 'missing', difference: null };
  const difference = Math.abs(actual - expected);
  if (difference <= 1e-12) return { kind: 'exact', difference };
  if (difference <= decimalTolerance(sourceText, expected, tolerance) + 1e-12) {
    return { kind: 'rounded', difference };
  }
  return { kind: 'mismatch', difference };
}

export function valueAtPath(record, name) {
  if (!record || typeof record !== 'object') return undefined;
  const wanted = key(name);
  const stack = [record];
  while (stack.length) {
    const item = stack.shift();
    for (const [field, value] of Object.entries(item)) {
      if (key(field) === wanted) return value;
      if (value && typeof value === 'object' && !Array.isArray(value)) stack.push(value);
    }
  }
  return undefined;
}

export function comparable(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  const number = text.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*(?:-?seconds?|s)?$/i);
  return number ? Number(number[1]) : key(text);
}

export function methodMatches(expected, candidate) {
  if (!expected) return false;
  const wanted = key(expected);
  return candidate.methodNames.some((name) => {
    const actual = key(name);
    return actual && (actual === wanted || actual.includes(wanted) || wanted.includes(actual));
  });
}

export function evaluateCandidate(claim, candidate, options = {}) {
  const facts = claim.normalized;
  const reasons = [];
  const contradictions = [];
  const expectedMethod = facts.target_method ?? facts.method ?? facts.parameters?.[0]?.scope ?? null;
  const methodMatch = methodMatches(expectedMethod, candidate);
  let score = methodMatch ? 20 : 0;
  if (methodMatch) reasons.push(`method ${expectedMethod} matches run lineage/config`);
  const metric = facts.metric;
  let metricValue = null;
  let number = null;
  if (claim.type === 'result_comparison' || claim.type === 'statistical') {
    if (metric) {
      metricValue = valueAtPath(candidate.metrics, metric);
      if (!finite(metricValue)) return null;
      score += 15;
      reasons.push(`metric ${metric} is recorded`);
    }
    if (claim.type === 'result_comparison') {
      number = numericMatch(metricValue, facts.target_value, claim.originalText, options.tolerance ?? 0);
      if (number.kind === 'exact') { score += 60; reasons.push(`${facts.target_value} exactly matches ${metricValue}`); }
      if (number.kind === 'rounded') { score += 45; reasons.push(`${facts.target_value} rounds consistently with ${metricValue}`); }
      if (number.kind === 'mismatch') { score -= 25; contradictions.push(`${facts.target_value} differs from ${metricValue}`); }
    }
  }
  const claimDataset = facts.dataset;
  if (claimDataset && candidate.dataset?.name) {
    if (key(claimDataset) !== key(candidate.dataset.name)) {
      if (claim.type === 'result_comparison') return null;
      contradictions.push(`dataset ${claimDataset} differs from ${candidate.dataset.name}`);
    } else { score += 10; reasons.push(`dataset ${claimDataset} matches`); }
  }
  const split = facts.split ?? facts.split_strategy;
  if (split && candidate.dataset?.strategy) {
    if (key(split) === key(candidate.dataset.strategy) ||
        (key(split).includes('patient') && key(candidate.dataset.strategy).includes('patient'))) {
      score += 6; reasons.push(`split ${candidate.dataset.strategy} matches`);
    } else if (claim.type === 'result_comparison') return null;
    else contradictions.push(`split ${split} differs from ${candidate.dataset.strategy}`);
  }
  const seed = facts.seed;
  if (seed != null && candidate.seed != null && Number(seed) !== Number(candidate.seed)) return null;
  const horizon = facts.horizon;
  const actualHorizon = valueAtPath(candidate.config, 'future_window');
  if (horizon != null && actualHorizon != null) {
    if (Number.parseFloat(horizon) !== Number(actualHorizon)) return null;
    score += 6; reasons.push(`horizon ${actualHorizon} matches`);
  }
  const task = facts.task;
  const actualTask = valueAtPath(candidate.config, 'task');
  if (task && actualTask && key(task) !== key(actualTask)) return null;
  if (task && actualTask) { score += 5; reasons.push(`task ${task} matches`); }
  const parameters = facts.parameters ?? [];
  for (const parameter of parameters) {
    const actual = valueAtPath(candidate.config, parameter.name);
    if (actual === undefined) continue;
    const expected = comparable(parameter.value);
    const observed = comparable(actual);
    if (typeof expected === 'number' && typeof observed === 'number'
      ? Math.abs(expected - observed) <= Math.max(1e-12, Math.abs(expected) * 1e-9)
      : expected === observed) {
      score += 8;
      reasons.push(`${parameter.name} ${String(actual)} matches config`);
    } else {
      score -= 3;
      contradictions.push(`${parameter.name} ${String(parameter.value)} differs from config ${String(actual)}`);
    }
  }
  if (claim.type === 'data' && !claimDataset && !split) return null;
  if (claim.type === 'statistical' && facts.repetitions && candidate.seed != null) {
    score += 2; reasons.push(`seed ${candidate.seed} recorded`);
  }
  return { runId: candidate.id, name: candidate.name, score, reasons, contradictions,
    numeric: number, metricValue, methodMatch, dataset: candidate.dataset,
    config: candidate.config, seed: candidate.seed, git: candidate.git,
    lineage: candidate.lineage, status: candidate.status };
}
