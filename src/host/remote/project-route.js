import { getProjectState, initializeProject } from '../project/project-service.js';

export const PROJECT_ROUTE = '/api/researchtrace/project';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function projectRoute(workspaceRegistry) {
  return {
    path: PROJECT_ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON request' }, 400);
      }
      if (!payload || typeof payload.workspaceId !== 'string'
          || !['state', 'init'].includes(payload.action)) {
        return jsonResponse({ error: 'Invalid project request' }, 400);
      }
      const workspace = workspaceRegistry.get(payload.workspaceId);
      if (!workspace) return jsonResponse({ error: 'Workspace not found' }, 404);
      try {
        const state = payload.action === 'init'
          ? initializeProject(workspace.path)
          : getProjectState(workspace.path);
        return jsonResponse(state);
      } catch (error) {
        return jsonResponse({ error: error instanceof Error ? error.message : 'Project operation failed' }, 500);
      }
    },
  };
}
