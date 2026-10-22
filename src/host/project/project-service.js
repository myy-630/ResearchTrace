import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrate, SCHEMA_VERSION } from '../db/migrations.js';

export const DATA_DIR_NAME = '.researchtrace';
export const DATABASE_NAME = 'researchtrace.db';

function canonicalRoot(rootPath) {
  if (typeof rootPath !== 'string' || !rootPath) throw new TypeError('Workspace path is required');
  const resolved = realpathSync(rootPath);
  if (!statSync(resolved).isDirectory()) throw new Error('Workspace path is not a directory');
  return resolved;
}

function pathsFor(rootPath) {
  const root = canonicalRoot(rootPath);
  const dataDir = join(root, DATA_DIR_NAME);
  return { root, dataDir, databasePath: join(dataDir, DATABASE_NAME) };
}

function assertSafeDataDir(dataDir, create) {
  if (!existsSync(dataDir) && create) mkdirSync(dataDir, { mode: 0o700 });
  if (!existsSync(dataDir)) return false;
  const stat = lstatSync(dataDir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('ResearchTrace data path must be a real directory');
  }
  return true;
}

function assertSafeDatabaseFile(databasePath) {
  if (!existsSync(databasePath)) return;
  const stat = lstatSync(databasePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('ResearchTrace database path must be a regular file');
  }
}

function openDatabase(databasePath) {
  assertSafeDatabaseFile(databasePath);
  const db = new DatabaseSync(databasePath);
  try {
    migrate(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function projectState(db, root, databasePath) {
  const row = db.prepare('SELECT * FROM projects LIMIT 1').get();
  if (!row) return { initialized: false, workspaceRoot: root };
  if (row.root_path !== root) throw new Error('ResearchTrace database belongs to another workspace');
  return {
    initialized: true,
    workspaceRoot: root,
    databasePath,
    project: {
      id: row.id,
      name: row.name,
      rootPath: row.root_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      schemaVersion: row.schema_version,
    },
  };
}

export function getProjectState(rootPath) {
  const { root, dataDir, databasePath } = pathsFor(rootPath);
  if (!assertSafeDataDir(dataDir, false) || !existsSync(databasePath)) {
    return { initialized: false, workspaceRoot: root };
  }
  const db = openDatabase(databasePath);
  try {
    return projectState(db, root, databasePath);
  } finally {
    db.close();
  }
}

export function initializeProject(rootPath) {
  const { root, dataDir, databasePath } = pathsFor(rootPath);
  assertSafeDataDir(dataDir, true);
  const db = openDatabase(databasePath);
  try {
    const existing = projectState(db, root, databasePath);
    if (existing.initialized) return existing;
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO projects
      (id, root_path, name, created_at, updated_at, schema_version)
      VALUES (?, ?, ?, ?, ?, ?)`).run(randomUUID(), root, basename(root), now, now, SCHEMA_VERSION);
    return projectState(db, root, databasePath);
  } finally {
    db.close();
  }
}
