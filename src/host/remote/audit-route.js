import { getAuditReport, listAuditReports, runAudit } from '../audit/audit-service.js';

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status,
    headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function auditRoute(workspaceRegistry) {
  return { path: '/api/researchtrace/audit', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      let payload;
      try { payload = await request.json(); }
      catch { return reply({ error: 'Invalid JSON request' }, 400); }
      if (!payload || typeof payload.workspaceId !== 'string' ||
          !['list', 'report', 'run'].includes(payload.action)) {
        return reply({ error: 'Invalid audit request' }, 400);
      }
      const workspace = workspaceRegistry.get(payload.workspaceId);
      if (!workspace) return reply({ error: 'Workspace not found' }, 404);
      try {
        const value = payload.action === 'list' ? listAuditReports(workspace.path, payload.documentId)
          : payload.action === 'report' ? getAuditReport(workspace.path, payload.sessionId)
            : runAudit(workspace.path, payload.documentId, { tolerance: payload.tolerance });
        return reply({ value });
      } catch (error) {
        return reply({ error: error instanceof Error ? error.message : 'Audit operation failed' }, 400);
      }
    } };
}
