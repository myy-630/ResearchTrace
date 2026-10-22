import { listDecisions, recordDecision, searchResearch } from '../decision/decision-service.js';

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status,
    headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function decisionRoute(workspaceRegistry) {
  return { path: '/api/researchtrace/decisions', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      let payload;
      try { payload = await request.json(); }
      catch { return reply({ error: 'Invalid JSON request' }, 400); }
      if (!payload || typeof payload.workspaceId !== 'string' ||
          !['record', 'list', 'search'].includes(payload.action)) {
        return reply({ error: 'Invalid decision request' }, 400);
      }
      const workspace = workspaceRegistry.get(payload.workspaceId);
      if (!workspace) return reply({ error: 'Workspace not found' }, 404);
      try {
        if (payload.action === 'record') return reply({ value: recordDecision(workspace.path, payload.decision) });
        if (payload.action === 'list') return reply({ value: listDecisions(workspace.path, payload.nodeId) });
        return reply({ value: searchResearch(workspace.path, payload.query, payload) });
      } catch (error) {
        return reply({ error: error instanceof Error ? error.message : 'Decision operation failed' }, 400);
      }
    } };
}
