import { getProjectState, initializeProject } from '../project/project-service.js';

export function workspaceRoot(exec, workspaceRegistry) {
  const cwd = exec.agent?.session?.header?.cwd;
  if (!cwd) throw new Error('This Harness session has no workspace directory');
  return workspaceRegistry.resolveByPath(cwd).then((workspace) => {
    if (!workspace) throw new Error('This session is not attached to a Harness workspace');
    return workspace.path;
  });
}

function projectTool(name, description, operation, workspaceRegistry) {
  return {
    name,
    description,
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(_args, exec) {
      const root = await workspaceRoot(exec, workspaceRegistry);
      return JSON.stringify(operation(root));
    },
  };
}

export function registerProjectTools(ctx) {
  const init = ctx.tools.register(projectTool(
    'researchtrace_init_project',
    'Initialize ResearchTrace in the current Harness workspace. Creates local .researchtrace/researchtrace.db; safe to repeat.',
    initializeProject,
    ctx.workspaceRegistry,
  ));
  const state = ctx.tools.register(projectTool(
    'researchtrace_get_project_state',
    'Read whether ResearchTrace is initialized in the current Harness workspace and return its local project record.',
    getProjectState,
    ctx.workspaceRegistry,
  ));
  return () => { state(); init(); };
}
