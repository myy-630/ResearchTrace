import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const configPath = option('--config');
const output = option('--output', 'results/future30/metrics.json');
const delayMs = Number(option('--delay-ms', '2500'));
if (!configPath) throw new Error('--config is required');
const config = await readFile(resolve(configPath), 'utf8');
const seed = Number(config.match(/^seed:\s*(\d+)/m)?.[1] ?? 7);
console.log(`Future30 training started, seed=${seed}`);
await new Promise((done) => setTimeout(done, delayMs));
if (process.argv.includes('--fail')) {
  console.error('Fixture training failed as requested');
  process.exitCode = 2;
} else {
  const path = resolve(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ auprc: 0.5614, best_epoch: 3, seed }, null, 2));
  await writeFile(resolve(dirname(path), 'checkpoint.pt'), 'fixture checkpoint\n');
  console.log(`Saved metrics to ${path}`);
}
