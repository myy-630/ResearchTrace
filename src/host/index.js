import { projectRoute } from './remote/project-route.js';
import { runRoute } from './remote/run-route.js';
import { treeRoute } from './remote/tree-route.js';
import { decisionRoute } from './remote/decision-route.js';
import { paperRoute } from './remote/paper-route.js';
import { traceRoute } from './remote/trace-route.js';
import { registerProjectTools } from './tools/project-tools.js';
import { registerExperimentTool } from './tools/experiment-tool.js';
import { registerTreeTools } from './tools/tree-tools.js';
import { registerDecisionTools } from './tools/decision-tools.js';
import { registerPaperTools } from './tools/paper-tools.js';
import { recoverInterruptedRuns } from './experiment/run-repository.js';

export const inject = ['connection', 'workspaceRegistry', 'tools', 'llm'];

export function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register(projectRoute(ctx.workspaceRegistry)),
    'researchtrace: project BFF');
  ctx.effect(() => ctx.connection.fetch.register(runRoute(ctx.workspaceRegistry)),
    'researchtrace: run BFF');
  ctx.effect(() => ctx.connection.fetch.register(treeRoute(ctx.workspaceRegistry)),
    'researchtrace: tree BFF');
  ctx.effect(() => ctx.connection.fetch.register(decisionRoute(ctx.workspaceRegistry)),
    'researchtrace: decision BFF');
  ctx.effect(() => ctx.connection.fetch.register(paperRoute(ctx.workspaceRegistry)),
    'researchtrace: paper BFF');
  ctx.effect(() => ctx.connection.fetch.register(traceRoute(ctx.workspaceRegistry)),
    'researchtrace: trace BFF');
  ctx.effect(() => registerProjectTools(ctx), 'researchtrace: project tools');
  ctx.effect(() => registerExperimentTool(ctx), 'researchtrace: experiment tool');
  ctx.effect(() => registerTreeTools(ctx), 'researchtrace: tree tools');
  ctx.effect(() => registerDecisionTools(ctx), 'researchtrace: decision tools');
  ctx.effect(() => registerPaperTools(ctx), 'researchtrace: paper tools');
  for (const workspace of ctx.workspaceRegistry.list()) {
    try { recoverInterruptedRuns(workspace.path); }
    catch (error) { ctx.logger?.debug?.(`researchtrace: skip recovery for ${workspace.path}: ${String(error)}`); }
  }
}
