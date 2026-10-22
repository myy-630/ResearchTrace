import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { migrate, SCHEMA_VERSION } from '../src/host/db/migrations.js';

test('migration creates every specified table and is idempotent', () => {
  const db = new DatabaseSync(':memory:');
  try {
    assert.equal(migrate(db), SCHEMA_VERSION);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all().map((row) => row.name);
    for (const name of [
      'schema_migrations', 'projects', 'worktree_nodes', 'run_details', 'assets',
      'decisions', 'documents', 'claims', 'claim_run_links', 'audit_sessions', 'audit_findings',
    ]) assert.ok(names.includes(name), `missing table ${name}`);
    assert.equal(migrate(db), SCHEMA_VERSION);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, SCHEMA_VERSION);
    assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  } finally {
    db.close();
  }
});

test('migration refuses a newer database schema', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA user_version = 999');
    assert.throws(() => migrate(db), /newer than supported/);
  } finally {
    db.close();
  }
});
