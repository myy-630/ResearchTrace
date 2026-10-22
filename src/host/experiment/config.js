import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import YAML from '../../../vendor/yaml/dist/index.js';

const SECRET_KEY = /(?:api[_-]?key|token|password|secret|credential|private[_-]?key)/i;

export function withinWorkspace(root, candidate) {
  const canonicalRoot = realpathSync(root);
  const absolute = realpathSync(isAbsolute(candidate) ? candidate : resolve(canonicalRoot, candidate));
  const relativePath = relative(canonicalRoot, absolute);
  if (relativePath === '..' || relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
      || isAbsolute(relativePath)) {
    throw new Error(`Path is outside the Harness workspace: ${candidate}`);
  }
  return absolute;
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key, SECRET_KEY.test(key) ? '[REDACTED]' : redactSecrets(item),
    ]));
  }
  return value;
}

export function parseConfigText(text, extension) {
  let parsed;
  if (extension === '.json') parsed = JSON.parse(text);
  else if (extension === '.yaml' || extension === '.yml') parsed = YAML.parse(text, { uniqueKeys: true });
  else throw new Error(`Unsupported configuration format: ${extension}`);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Configuration must be a mapping/object');
  }
  return redactSecrets(parsed);
}

export function configPathFromCommand(command) {
  const match = command.match(/(?:^|\s)--config(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

export function seedFromCommand(command) {
  const match = command.match(/(?:^|\s)--seed(?:=|\s+)(\d+)(?:\s|$)/);
  return match ? Number(match[1]) : null;
}

function scalar(text) {
  if (/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text)) return Number(text);
  if (text === 'true') return true;
  if (text === 'false') return false;
  return text;
}

export function configValuesFromCommand(command) {
  const values = {};
  const keys = { seed: 'seed', 'learning-rate': 'learning_rate', lr: 'learning_rate',
    'batch-size': 'batch_size', epochs: 'epochs', dataset: 'dataset',
    'split-path': 'split_path', 'split-file': 'split_file' };
  for (const match of command.matchAll(/(?:^|\s)--([\w-]+)(?:=|\s+)(?:"([^"]+)"|'([^']+)'|([^\s]+))/g)) {
    if (keys[match[1]]) values[keys[match[1]]] = scalar(match[2] ?? match[3] ?? match[4]);
  }
  return redactSecrets(values);
}

export function loadConfig(root, requestedPath, command, declaredValues = null) {
  let path = requestedPath || configPathFromCommand(command);
  if (!path) {
    const rulesPath = join(root, '.researchtrace', 'project.yaml');
    if (existsSync(rulesPath)) {
      const rules = parseConfigText(readFileSync(rulesPath, 'utf8'), '.yaml');
      path = rules.experiment?.config_path ?? rules.experiment?.config ?? rules.config_path ?? null;
    }
  }
  if (!path) {
    const values = { ...configValuesFromCommand(command), ...redactSecrets(declaredValues ?? {}) };
    return Object.keys(values).length ? { path: null, hash: sha256(JSON.stringify(values)), values,
      source: declaredValues ? 'declared' : 'command' } : null;
  }
  const absolute = withinWorkspace(root, path);
  if (!statSync(absolute).isFile()) throw new Error(`Configuration is not a file: ${path}`);
  const content = readFileSync(absolute);
  if (content.byteLength > 2 * 1024 * 1024) throw new Error('Configuration exceeds 2 MiB');
  const extension = absolute.slice(absolute.lastIndexOf('.')).toLowerCase();
  const values = parseConfigText(content.toString('utf8'), extension);
  return { path: absolute, hash: sha256(content), values,
    source: requestedPath ? 'explicit' : configPathFromCommand(command) ? 'command-file' : 'project-rule' };
}
