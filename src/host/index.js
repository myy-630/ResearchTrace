import { projectRoute } from './remote/project-route.js';
import { runRoute } from './remote/run-route.js';
import { registerProjectTools } from './tools/project-tools.js';
import { registerExperimentTool } from './tools/experiment-tool.js';
import { recoverInterruptedRuns } from './experiment/run-repository.js';

export const inject = ['connection', 'workspaceRegistry', 'tools'];

export function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register(projectRoute(ctx.workspaceRegistry)),
    'researchtrace: project BFF');
  ctx.effect(() => ctx.connection.fetch.register(runRoute(ctx.workspaceRegistry)),
    'researchtrace: run BFF');
  ctx.effect(() => registerProjectTools(ctx), 'researchtrace: project tools');
  ctx.effect(() => registerExperimentTool(ctx), 'researchtrace: experiment tool');
  for (const workspace of ctx.workspaceRegistry.list()) {
    try { recoverInterruptedRuns(workspace.path); }
    catch (error) { ctx.logger?.debug?.(`researchtrace: skip recovery for ${workspace.path}: ${String(error)}`); }
  }
}
