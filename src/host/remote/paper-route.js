import { listClaims, listDocuments } from '../paper/document-service.js';

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status,
    headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function paperRoute(workspaceRegistry) {
  return { path: '/api/researchtrace/paper', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      let payload;
      try { payload = await request.json(); }
      catch { return reply({ error: 'Invalid JSON request' }, 400); }
      if (!payload || typeof payload.workspaceId !== 'string' || !['list', 'claims'].includes(payload.action)) {
        return reply({ error: 'Invalid paper request' }, 400);
      }
      const workspace = workspaceRegistry.get(payload.workspaceId);
      if (!workspace) return reply({ error: 'Workspace not found' }, 404);
      try { return reply({ value: payload.action === 'list'
        ? listDocuments(workspace.path) : listClaims(workspace.path, payload.documentId ?? null) }); }
      catch (error) { return reply({ error: error instanceof Error ? error.message : 'Paper operation failed' }, 400); }
    } };
}
