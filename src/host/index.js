import { projectRoute } from './remote/project-route.js';
import { registerProjectTools } from './tools/project-tools.js';

export const inject = ['connection', 'workspaceRegistry', 'tools'];

export function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register(projectRoute(ctx.workspaceRegistry)),
    'researchtrace: project BFF');
  ctx.effect(() => registerProjectTools(ctx), 'researchtrace: project tools');
}
