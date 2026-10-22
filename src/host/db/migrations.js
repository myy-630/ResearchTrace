export const SCHEMA_VERSION = 1;

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        root_path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        schema_version INTEGER NOT NULL
      );
      CREATE TABLE worktree_nodes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('research_question', 'method', 'experiment_group', 'run')),
        parent_id TEXT REFERENCES worktree_nodes(id),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'rejected', 'archived')),
        is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
        motivation TEXT,
        summary TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      );
      CREATE INDEX worktree_nodes_project_parent ON worktree_nodes(project_id, parent_id);
      CREATE TABLE run_details (
        node_id TEXT PRIMARY KEY REFERENCES worktree_nodes(id) ON DELETE CASCADE,
        execution_status TEXT NOT NULL CHECK (execution_status IN ('created', 'running', 'succeeded', 'failed', 'cancelled', 'interrupted')),
        user_intent TEXT NOT NULL,
        command TEXT NOT NULL,
        cwd TEXT NOT NULL,
        started_at TEXT,
        ended_at TEXT,
        exit_code INTEGER,
        git_commit TEXT,
        git_branch TEXT,
        git_dirty INTEGER CHECK (git_dirty IN (0, 1)),
        git_diff_hash TEXT,
        config_json TEXT CHECK (config_json IS NULL OR json_valid(config_json)),
        metrics_json TEXT CHECK (metrics_json IS NULL OR json_valid(metrics_json)),
        dataset_json TEXT CHECK (dataset_json IS NULL OR json_valid(dataset_json)),
        seed INTEGER
      );
      CREATE TABLE assets (
        id TEXT PRIMARY KEY,
        run_node_id TEXT NOT NULL REFERENCES run_details(node_id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('config', 'metrics', 'checkpoint', 'prediction', 'figure', 'table', 'log', 'dataset_split', 'other')),
        path TEXT NOT NULL,
        content_hash TEXT,
        size INTEGER CHECK (size IS NULL OR size >= 0),
        metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX assets_run ON assets(run_node_id);
      CREATE TABLE decisions (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES worktree_nodes(id) ON DELETE CASCADE,
        decision_type TEXT NOT NULL CHECK (decision_type IN ('continue', 'pause', 'reject', 'archive', 'promote_to_primary', 'reopen')),
        raw_user_text TEXT NOT NULL,
        summary TEXT NOT NULL,
        reason TEXT,
        alternative_route TEXT,
        reopen_condition TEXT,
        related_run_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(related_run_ids_json)),
        created_at TEXT NOT NULL
      );
      CREATE INDEX decisions_node ON decisions(node_id);
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('md', 'tex', 'docx')),
        content_hash TEXT NOT NULL,
        git_commit TEXT,
        parsed_at TEXT
      );
      CREATE TABLE claims (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        claim_type TEXT NOT NULL CHECK (claim_type IN ('result_comparison', 'experiment_setting', 'data', 'statistical')),
        original_text TEXT NOT NULL,
        normalized_json TEXT NOT NULL CHECK (json_valid(normalized_json)),
        source_location_json TEXT NOT NULL CHECK (json_valid(source_location_json)),
        parse_model TEXT,
        parse_version TEXT,
        status TEXT NOT NULL CHECK (status IN ('unmatched', 'matched', 'ambiguous', 'conflict', 'insufficient_evidence')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX claims_document ON claims(document_id);
      CREATE TABLE claim_run_links (
        id TEXT PRIMARY KEY,
        claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        run_node_id TEXT NOT NULL REFERENCES run_details(node_id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('confirmed', 'candidate', 'rejected')),
        confidence REAL,
        reasons_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reasons_json)),
        created_at TEXT NOT NULL,
        UNIQUE (claim_id, run_node_id)
      );
      CREATE TABLE audit_sessions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        document_hash TEXT NOT NULL,
        rules_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        error_count INTEGER NOT NULL DEFAULT 0,
        warning_count INTEGER NOT NULL DEFAULT 0,
        info_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX audit_sessions_document ON audit_sessions(document_id);
      CREATE TABLE audit_findings (
        id TEXT PRIMARY KEY,
        audit_session_id TEXT NOT NULL REFERENCES audit_sessions(id) ON DELETE CASCADE,
        rule_id TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
        message TEXT NOT NULL,
        claim_id TEXT REFERENCES claims(id),
        run_node_id TEXT REFERENCES run_details(node_id),
        paper_evidence_json TEXT NOT NULL CHECK (json_valid(paper_evidence_json)),
        experiment_evidence_json TEXT NOT NULL CHECK (json_valid(experiment_evidence_json)),
        recommendation TEXT NOT NULL
      );
      CREATE INDEX audit_findings_session ON audit_findings(audit_session_id);
    `,
  },
];

export function migrate(db) {
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const current = db.prepare('PRAGMA user_version').get().user_version;
  if (current > SCHEMA_VERSION) {
    throw new Error(`ResearchTrace database schema ${current} is newer than supported ${SCHEMA_VERSION}`);
  }
  for (const migration of migrations) {
    if (migration.version <= current) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(migration.version, new Date().toISOString());
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return SCHEMA_VERSION;
}
