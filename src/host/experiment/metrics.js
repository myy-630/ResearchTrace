import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { withinWorkspace } from './config.js';

function csvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim()); cell = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error('Unterminated CSV quoted cell');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function numericRecord(record) {
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === '' || value === null || value === undefined) continue;
    const number = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(number)) result[key] = number;
  }
  return result;
}

export function parseMetricsText(text, extension) {
  if (extension === '.json') {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Metrics JSON must be an object');
    }
    return numericRecord(parsed.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : parsed);
  }
  if (extension === '.csv') {
    const [header, ...rows] = csvRows(text);
    if (!header || rows.length === 0) throw new Error('Metrics CSV has no data rows');
    const values = rows.map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] ?? ''])));
    if (header.includes('metric') && header.includes('value')) {
      return numericRecord(Object.fromEntries(values.map((row) => [row.metric, row.value])));
    }
    return numericRecord(values.at(-1));
  }
  throw new Error(`Unsupported metrics format: ${extension}`);
}

export function loadMetrics(root, requestedPath) {
  if (!requestedPath) return null;
  const absolute = withinWorkspace(root, requestedPath);
  if (!statSync(absolute).isFile()) throw new Error(`Metrics path is not a file: ${requestedPath}`);
  const content = readFileSync(absolute);
  if (content.byteLength > 8 * 1024 * 1024) throw new Error('Metrics file exceeds 8 MiB');
  return { path: absolute, values: parseMetricsText(content.toString('utf8'), extname(absolute).toLowerCase()) };
}
