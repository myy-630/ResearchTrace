import { getRunDetail, listRecentRuns } from '../experiment/run-repository.js';

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function runRoute(workspaceRegistry) {
  return {
    path: '/api/researchtrace/runs',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      let payload;
      try { payload = await request.json(); }
      catch { return reply({ error: 'Invalid JSON request' }, 400); }
      if (!payload || typeof payload.workspaceId !== 'string'
          || !['list', 'detail'].includes(payload.action)
          || (payload.action === 'detail' && typeof payload.runId !== 'string')) {
        return reply({ error: 'Invalid run request' }, 400);
      }
      const workspace = workspaceRegistry.get(payload.workspaceId);
      if (!workspace) return reply({ error: 'Workspace not found' }, 404);
      try {
        if (payload.action === 'list') return reply({ runs: listRecentRuns(workspace.path) });
        const run = getRunDetail(workspace.path, payload.runId);
        return run ? reply({ run }) : reply({ error: 'Run not found' }, 404);
      } catch (error) {
        return reply({ error: error instanceof Error ? error.message : 'Run operation failed' }, 500);
      }
    },
  };
}
