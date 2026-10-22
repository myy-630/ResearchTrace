import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openProjectDatabase } from '../project/project-service.js';
import { captureGit } from '../experiment/git.js';
import { sha256, withinWorkspace } from '../experiment/config.js';
import { validateExtractedClaims } from './claims.js';
import { parsePaper } from './parsers.js';

const MAX_DOCUMENT = 20 * 1024 * 1024;
const PARSER_VERSION = 'researchtrace-paper-v2';
const now = () => new Date().toISOString();

function claimFromRow(row) {
  return { id: row.id, documentId: row.document_id, type: row.claim_type,
    originalText: row.original_text, normalized: JSON.parse(row.normalized_json),
    sourceLocation: JSON.parse(row.source_location_json), parseModel: row.parse_model,
    parseVersion: row.parse_version, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at };
}

function documentFromRow(row) {
  return { id: row.id, path: row.path, type: row.type, contentHash: row.content_hash,
    gitCommit: row.git_commit, parsedAt: row.parsed_at, parserVersion: row.parser_version };
}

export function listDocuments(rootPath) {
  const { db } = openProjectDatabase(rootPath);
  try {
    return db.prepare(`SELECT d.*, count(c.id) AS claim_count FROM documents d
      LEFT JOIN claims c ON c.document_id = d.id GROUP BY d.id ORDER BY d.parsed_at DESC`)
      .all().map((row) => ({ ...documentFromRow(row), claimCount: row.claim_count }));
  } finally { db.close(); }
}

export function listClaims(rootPath, documentId = null) {
  const { db } = openProjectDatabase(rootPath);
  try {
    return (documentId
      ? db.prepare('SELECT * FROM claims WHERE document_id = ? ORDER BY created_at, id').all(documentId)
      : db.prepare('SELECT * FROM claims ORDER BY created_at, id').all()).map(claimFromRow);
  } finally { db.close(); }
}

export async function parseAndStoreDocument(rootPath, requestedPath, extractor) {
  const { db, root, dataDir } = openProjectDatabase(rootPath);
  try {
    const path = withinWorkspace(root, requestedPath);
    if (!statSync(path).isFile()) throw new Error('Paper document is not a file');
    if (statSync(path).size > MAX_DOCUMENT) throw new Error('Paper document exceeds 20 MiB');
    const content = readFileSync(path);
    const hash = sha256(content);
    const existing = db.prepare('SELECT * FROM documents WHERE path = ?').get(path);
    const cachePath = join(dataDir, 'cache', 'documents', `${hash}.segments.json`);
    if (existing?.content_hash === hash && existing.parser_version === PARSER_VERSION) {
      const cachedSegments = JSON.parse(readFileSync(cachePath, 'utf8')).segments;
      return { document: documentFromRow(existing), claims: listClaims(root, existing.id),
        cached: true, warnings: [], tableLocations: cachedSegments.filter((item) => item.location.table)
          .slice(0, 100).map(({ id, text, location }) => ({ id, text, location })) };
    }
    const parsed = parsePaper(path, content);
    const cacheDir = join(dataDir, 'cache', 'documents');
    mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
    writeFileSync(cachePath, JSON.stringify({ path, hash,
      parserVersion: PARSER_VERSION, segments: parsed.segments }), { mode: 0o600 });
    const extraction = await extractor(parsed.segments);
    const claims = validateExtractedClaims(extraction.claims, parsed.segments);
    if (sha256(readFileSync(path)) !== hash) throw new Error('Paper document changed during parsing; retry');
    const gitCommit = captureGit(root).commit;
    const id = existing?.id ?? randomUUID();
    const time = now();
    db.exec('BEGIN IMMEDIATE');
    try {
      if (existing) {
        db.prepare('DELETE FROM audit_sessions WHERE document_id = ?').run(id);
        db.prepare('DELETE FROM claims WHERE document_id = ?').run(id);
        db.prepare(`UPDATE documents SET content_hash = ?, type = ?, git_commit = ?, parsed_at = ?,
          parser_version = ? WHERE id = ?`).run(hash, parsed.type, gitCommit, time, PARSER_VERSION, id);
      } else {
        db.prepare(`INSERT INTO documents (id, path, type, content_hash, git_commit, parsed_at, parser_version)
          VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, path, parsed.type, hash, gitCommit, time, PARSER_VERSION);
      }
      const insert = db.prepare(`INSERT INTO claims (id, document_id, claim_type, original_text,
        normalized_json, source_location_json, parse_model, parse_version, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unmatched', ?, ?)`);
      for (const claim of claims) insert.run(randomUUID(), id, claim.claimType, claim.originalText,
        JSON.stringify(claim.normalized), JSON.stringify(claim.sourceLocation),
        extraction.model, extraction.version, time, time);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return { document: documentFromRow(db.prepare('SELECT * FROM documents WHERE id = ?').get(id)),
      claims: listClaims(root, id), cached: false, warnings: parsed.warnings,
      tableLocations: parsed.segments.filter((item) => item.location.table).slice(0, 100)
        .map(({ id, text, location }) => ({ id, text, location })) };
  } finally { db.close(); }
}
