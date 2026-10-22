import { confirmClaimLink, getClaimTrace, traceClaim } from '../trace/trace-service.js';

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status,
    headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function traceRoute(workspaceRegistry) {
  return { path: '/api/researchtrace/trace', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      let payload;
      try { payload = await request.json(); }
      catch { return reply({ error: 'Invalid JSON request' }, 400); }
      if (!payload || typeof payload.workspaceId !== 'string' || typeof payload.claimId !== 'string' ||
          !['get', 'trace', 'confirm'].includes(payload.action)) {
        return reply({ error: 'Invalid trace request' }, 400);
      }
      const workspace = workspaceRegistry.get(payload.workspaceId);
      if (!workspace) return reply({ error: 'Workspace not found' }, 404);
      try {
        const options = { includeArchived: payload.includeArchived === true,
          includeRejected: payload.includeRejected === true, tolerance: payload.tolerance };
        const value = payload.action === 'get' ? getClaimTrace(workspace.path, payload.claimId)
          : payload.action === 'trace' ? await traceClaim(workspace.path, payload.claimId, options)
            : confirmClaimLink(workspace.path, payload.claimId, payload.runId, options);
        return reply({ value });
      } catch (error) {
        return reply({ error: error instanceof Error ? error.message : 'Trace operation failed' }, 400);
      }
    } };
}
