import { createNode, deleteNode, getNodeDetail, getTree, restoreNode, setNodeStatus,
  setPrimary, updateNode } from '../tree/tree-service.js';

const actions = { tree: (root) => getTree(root), detail: (root, value) => getNodeDetail(root, value.nodeId),
  create: (root, value) => createNode(root, value.node),
  update: (root, value) => updateNode(root, value.nodeId, value.changes),
  delete: (root, value) => deleteNode(root, value.nodeId),
  status: (root, value) => setNodeStatus(root, value.nodeId, value.status),
  restore: (root, value) => restoreNode(root, value.nodeId),
  primary: (root, value) => setPrimary(root, value.nodeId, value.primary !== false) };

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status,
    headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function treeRoute(workspaceRegistry) {
  return { path: '/api/researchtrace/tree', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      let payload;
      try { payload = await request.json(); }
      catch { return reply({ error: 'Invalid JSON request' }, 400); }
      if (!payload || typeof payload.workspaceId !== 'string' || !Object.hasOwn(actions, payload.action)) {
        return reply({ error: 'Invalid tree request' }, 400);
      }
      const workspace = workspaceRegistry.get(payload.workspaceId);
      if (!workspace) return reply({ error: 'Workspace not found' }, 404);
      try { return reply({ value: actions[payload.action](workspace.path, payload) }); }
      catch (error) { return reply({ error: error instanceof Error ? error.message : 'Tree operation failed' }, 400); }
    } };
}
