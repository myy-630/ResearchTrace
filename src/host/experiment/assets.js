import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { withinWorkspace } from './config.js';

const HASH_LIMIT = 64 * 1024 * 1024;

function assetType(path) {
  const extension = extname(path).toLowerCase();
  const name = basename(path).toLowerCase();
  if (name.includes('predict')) return 'prediction';
  if (name.includes('split')) return 'dataset_split';
  if (name.includes('table')) return 'table';
  if (['.json', '.csv'].includes(extension)) return 'metrics';
  if (['.yaml', '.yml', '.toml'].includes(extension)) return 'config';
  if (['.ckpt', '.pt', '.pth', '.safetensors'].includes(extension)) return 'checkpoint';
  if (['.png', '.jpg', '.jpeg', '.svg'].includes(extension)) return 'figure';
  if (['.log', '.txt'].includes(extension)) return 'log';
  return 'other';
}

async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function describeAsset(root, requestedPath, type = null) {
  const path = withinWorkspace(root, requestedPath);
  const stat = statSync(path);
  if (!stat.isFile()) throw new Error(`Asset is not a file: ${requestedPath}`);
  const hashed = stat.size <= HASH_LIMIT;
  return {
    id: randomUUID(),
    type: type ?? assetType(path),
    path,
    contentHash: hashed ? await hashFile(path) : null,
    size: stat.size,
    metadata: { name: basename(path), hashStrategy: hashed ? 'sha256' : 'skipped-large-file' },
    createdAt: new Date().toISOString(),
  };
}

export function insertAssets(db, runId, assets) {
  const statement = db.prepare(`INSERT INTO assets
    (id, run_node_id, type, path, content_hash, size, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const asset of assets) statement.run(asset.id, runId, asset.type, asset.path,
    asset.contentHash, asset.size, JSON.stringify(asset.metadata), asset.createdAt);
}
