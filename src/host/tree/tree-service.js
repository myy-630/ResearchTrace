import { randomUUID } from 'node:crypto';
import { openProjectDatabase } from '../project/project-service.js';
import { getRunDetail } from '../experiment/run-repository.js';

const PARENTS = {
  research_question: [null],
  method: ['research_question', 'method'],
  experiment_group: ['method'],
  run: ['experiment_group'],
};
const STATUSES = new Set(['active', 'paused', 'completed', 'rejected', 'archived']);
const HIDDEN = new Set(['rejected', 'archived']);
const stamp = () => new Date().toISOString();

function rowToNode(row) {
  return { id: row.id, projectId: row.project_id, type: row.type, parentId: row.parent_id,
    name: row.name, status: row.status, isPrimary: Boolean(row.is_primary),
    motivation: row.motivation, summary: row.summary, tags: JSON.parse(row.tags_json),
    createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at,
    executionStatus: row.execution_status ?? null };
}

function allNodes(db, projectId) {
  return db.prepare(`SELECT n.*, d.execution_status FROM worktree_nodes n
    LEFT JOIN run_details d ON d.node_id = n.id
    WHERE n.project_id = ? ORDER BY n.created_at, n.id`)
    .all(projectId).map(rowToNode);
}

function getNode(db, projectId, id) {
  const row = db.prepare('SELECT * FROM worktree_nodes WHERE project_id = ? AND id = ?')
    .get(projectId, id);
  if (!row) throw new Error(`Research node not found: ${id}`);
  return rowToNode(row);
}

function checkParent(db, projectId, type, parentId, movingId = null) {
  if (!(type in PARENTS)) throw new Error(`Invalid node type: ${type}`);
  if (type === 'run') throw new Error('Runs must be created through the experiment lifecycle');
  if (parentId == null) {
    if (!PARENTS[type].includes(null)) throw new Error(`${type} requires a parent node`);
    return;
  }
  const parent = getNode(db, projectId, parentId);
  if (!PARENTS[type].includes(parent.type)) throw new Error(`${type} cannot be placed under ${parent.type}`);
  if (movingId) {
    let current = parent;
    const seen = new Set();
    while (current) {
      if (current.id === movingId) throw new Error('Moving this node would create a cycle');
      if (seen.has(current.id)) throw new Error('Existing tree contains a cycle');
      seen.add(current.id);
      current = current.parentId ? getNode(db, projectId, current.parentId) : null;
    }
  }
}

function safeText(value, label, max = 2000) {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be text under ${max} characters`);
  return value.trim();
}

function safeTags(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 30 || value.some((tag) =>
    typeof tag !== 'string' || !tag.trim() || tag.length > 80)) throw new Error('Invalid tags');
  return [...new Set(value.map((tag) => tag.trim()))];
}

export function createNode(rootPath, input) {
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const type = input?.type;
    const name = safeText(input?.name, 'Name', 200);
    if (!name) throw new Error('Node name is required');
    checkParent(db, project.id, type, input.parentId ?? null);
    const id = randomUUID();
    const time = stamp();
    db.prepare(`INSERT INTO worktree_nodes
      (id, project_id, type, parent_id, name, status, is_primary, motivation, summary,
       tags_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', 0, ?, ?, ?, ?, ?)`).run(id, project.id, type,
      input.parentId ?? null, name, safeText(input.motivation, 'Motivation'),
      safeText(input.summary, 'Summary'), JSON.stringify(safeTags(input.tags)), time, time);
    return getNode(db, project.id, id);
  } finally { db.close(); }
}

export function updateNode(rootPath, id, changes) {
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const current = getNode(db, project.id, id);
    if (changes.parentId !== undefined && changes.parentId !== current.parentId) {
      checkParent(db, project.id, current.type, changes.parentId, id);
    }
    const name = changes.name === undefined ? current.name : safeText(changes.name, 'Name', 200);
    if (!name) throw new Error('Node name is required');
    db.prepare(`UPDATE worktree_nodes SET parent_id = ?, name = ?, motivation = ?, summary = ?,
      tags_json = ?, is_primary = ?, updated_at = ? WHERE id = ?`).run(
      changes.parentId === undefined ? current.parentId : changes.parentId, name,
      changes.motivation === undefined ? current.motivation : safeText(changes.motivation, 'Motivation'),
      changes.summary === undefined ? current.summary : safeText(changes.summary, 'Summary'),
      JSON.stringify(changes.tags === undefined ? current.tags : safeTags(changes.tags)),
      changes.parentId !== undefined && changes.parentId !== current.parentId ? 0 : Number(current.isPrimary),
      stamp(), id);
    return getNode(db, project.id, id);
  } finally { db.close(); }
}

export function deleteNode(rootPath, id) {
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const node = getNode(db, project.id, id);
    if (node.type === 'run') throw new Error('Runs are durable provenance and cannot be deleted');
    const children = db.prepare('SELECT count(*) AS count FROM worktree_nodes WHERE parent_id = ?').get(id).count;
    if (children) throw new Error('Only empty leaf nodes can be deleted; archive populated routes instead');
    db.prepare('DELETE FROM worktree_nodes WHERE id = ?').run(id);
    return { deletedId: id };
  } finally { db.close(); }
}

export function setNodeStatus(rootPath, id, status) {
  if (!STATUSES.has(status)) throw new Error(`Invalid node status: ${status}`);
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const node = getNode(db, project.id, id);
    if (node.type === 'run') throw new Error('Run execution status is managed by its lifecycle');
    db.prepare(`UPDATE worktree_nodes SET status = ?, archived_at = ?, is_primary =
      CASE WHEN ? IN ('rejected', 'archived') THEN 0 ELSE is_primary END,
      updated_at = ? WHERE id = ?`).run(status, status === 'archived' ? stamp() : null,
      status, stamp(), id);
    return getNode(db, project.id, id);
  } finally { db.close(); }
}

export function restoreNode(rootPath, id) { return setNodeStatus(rootPath, id, 'active'); }

export function setPrimary(rootPath, id, primary = true) {
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const node = getNode(db, project.id, id);
    if (node.type !== 'method') throw new Error('Only methods may be primary');
    if (primary && HIDDEN.has(node.status)) throw new Error('Archived or rejected methods cannot be primary');
    if (primary) {
      let ancestor = node.parentId ? getNode(db, project.id, node.parentId) : null;
      while (ancestor) {
        if (HIDDEN.has(ancestor.status)) throw new Error('Methods under archived or rejected routes cannot be primary');
        ancestor = ancestor.parentId ? getNode(db, project.id, ancestor.parentId) : null;
      }
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      if (primary) db.prepare(`UPDATE worktree_nodes SET is_primary = 0, updated_at = ?
        WHERE project_id = ? AND parent_id IS ? AND type = 'method' AND is_primary = 1`)
        .run(stamp(), project.id, node.parentId);
      db.prepare('UPDATE worktree_nodes SET is_primary = ?, updated_at = ? WHERE id = ?')
        .run(Number(Boolean(primary)), stamp(), id);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return getNode(db, project.id, id);
  } finally { db.close(); }
}

export function getTree(rootPath) {
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const nodes = allNodes(db, project.id);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const visible = new Map();
    const visiting = new Set();
    function defaultVisible(node) {
      if (visible.has(node.id)) return visible.get(node.id);
      if (visiting.has(node.id)) throw new Error('Research tree contains a cycle');
      visiting.add(node.id);
      const result = !HIDDEN.has(node.status) && (!node.parentId ||
        (byId.has(node.parentId) && defaultVisible(byId.get(node.parentId))));
      visiting.delete(node.id);
      visible.set(node.id, result);
      return result;
    }
    for (const node of nodes) {
      node.defaultVisible = defaultVisible(node);
      node.children = [];
    }
    const roots = [];
    for (const node of nodes) {
      if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId).children.push(node);
      else roots.push(node);
    }
    return { roots, nodes };
  } finally { db.close(); }
}

export function getRetrievableTree(rootPath, { includeArchived = false, includeRejected = false } = {}) {
  const tree = getTree(rootPath);
  const nodes = [];
  function include(node) {
    if (node.status === 'archived' && !includeArchived) return null;
    if (node.status === 'rejected' && !includeRejected) return null;
    const copy = { ...node, children: [] };
    nodes.push(copy);
    copy.children = node.children.map(include).filter(Boolean);
    return copy;
  }
  return { roots: tree.roots.map(include).filter(Boolean), nodes };
}

export function getNodeDetail(rootPath, id) {
  const { db, project } = openProjectDatabase(rootPath);
  try {
    const node = getNode(db, project.id, id);
    const lineage = [];
    let current = node;
    while (current) {
      lineage.unshift({ id: current.id, name: current.name, type: current.type, status: current.status });
      current = current.parentId ? getNode(db, project.id, current.parentId) : null;
    }
    const children = db.prepare('SELECT * FROM worktree_nodes WHERE parent_id = ? ORDER BY created_at, id')
      .all(id).map(rowToNode);
    const runs = node.type === 'method' || node.type === 'experiment_group'
      ? db.prepare(`WITH RECURSIVE descendants(id) AS (
          SELECT id FROM worktree_nodes WHERE id = ?
          UNION ALL SELECT n.id FROM worktree_nodes n JOIN descendants d ON n.parent_id = d.id
        ) SELECT n.id, n.name, d.execution_status AS status, d.metrics_json AS metricsJson
        FROM worktree_nodes n JOIN descendants x ON n.id = x.id
        JOIN run_details d ON d.node_id = n.id ORDER BY n.created_at DESC LIMIT 30`).all(id)
        .map(({ metricsJson, ...run }) => ({ ...run, metrics: metricsJson ? JSON.parse(metricsJson) : null }))
      : [];
    const decisions = db.prepare(`SELECT * FROM decisions WHERE node_id = ?
      ORDER BY created_at DESC, id DESC LIMIT 30`).all(id).map((row) => ({
      id: row.id, type: row.decision_type, rawUserText: row.raw_user_text,
      summary: row.summary, reason: row.reason, alternativeRoute: row.alternative_route,
      reopenCondition: row.reopen_condition, relatedRunIds: JSON.parse(row.related_run_ids_json),
      createdAt: row.created_at }));
    const relatedClaims = db.prepare(`WITH RECURSIVE descendants(id) AS (
        SELECT id FROM worktree_nodes WHERE id = ?
        UNION ALL SELECT n.id FROM worktree_nodes n JOIN descendants d ON n.parent_id = d.id
      ) SELECT DISTINCT c.id, c.document_id AS documentId, c.original_text AS originalText,
        c.status, p.path AS documentPath
      FROM claim_run_links l JOIN claims c ON c.id = l.claim_id
      JOIN documents p ON p.id = c.document_id
      WHERE l.status = 'confirmed' AND l.run_node_id IN (SELECT id FROM descendants)
      ORDER BY c.created_at DESC LIMIT 30`).all(id);
    return { node, lineage, children, runs, decisions, relatedClaims,
      run: node.type === 'run' ? getRunDetail(rootPath, id) : null };
  } finally { db.close(); }
}
