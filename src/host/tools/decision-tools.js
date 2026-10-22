import { recordDecision, searchResearch } from '../decision/decision-service.js';
import { workspaceRoot } from './project-tools.js';

const decisionProperties = {
  nodeId: { type: 'string', description: 'Exact target node id from ResearchTrace search/tree.' },
  rawUserText: { type: 'string', description: 'Preserve the original user statement verbatim.' },
  summary: { type: 'string', description: 'Concise qualitative summary. Numeric claims must be grounded in user text or linked run data.' },
  reason: { type: 'string' }, alternativeRoute: { type: 'string' },
  reopenCondition: { type: 'string' },
  relatedRunIds: { type: 'array', items: { type: 'string' }, description: 'Key run ids used as evidence.' },
};

function tool(ctx, name, description, parameters, action) {
  return ctx.tools.register({ name, description, parameters,
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(input, exec) {
      const root = await workspaceRoot(exec, ctx.workspaceRegistry);
      return JSON.stringify(action(root, input));
    } });
}

export function registerDecisionTools(ctx) {
  const disposers = [
    tool(ctx, 'researchtrace_search',
      'Search local research nodes, decisions, and runs. Archived/rejected ancestors are excluded by default. Set include_archived/include_rejected for explicit historical requests; exact named archived routes also resolve to their history. Cite returned decision and run ids.',
      { type: 'object', additionalProperties: false, required: ['query'], properties: {
        query: { type: 'string' }, include_archived: { type: 'boolean', default: false },
        include_rejected: { type: 'boolean', default: false }, limit: { type: 'integer' },
      } }, (root, input) => searchResearch(root, input.query, input)),
    tool(ctx, 'researchtrace_record_decision',
      'Record a grounded research decision and apply its status/primary change. Preserve the original user wording, link key runs, and do not invent experiment numbers.',
      { type: 'object', additionalProperties: false,
        required: ['nodeId', 'type', 'rawUserText'],
        properties: { ...decisionProperties, type: { type: 'string',
          enum: ['continue', 'pause', 'reject', 'archive', 'promote_to_primary', 'reopen'] } } },
      (root, input) => recordDecision(root, input)),
    tool(ctx, 'researchtrace_archive_node',
      'Logically archive or reject a method/group after recording the user reason and key run evidence. Never move or delete user files. Archived descendants leave default retrieval.',
      { type: 'object', additionalProperties: false, required: ['nodeId', 'rawUserText'],
        properties: { ...decisionProperties, decisionType: { type: 'string', enum: ['archive', 'reject'] } } },
      (root, input) => recordDecision(root, { ...input, type: input.decisionType ?? 'archive' })),
  ];
  return () => { for (const dispose of disposers.reverse()) dispose(); };
}
