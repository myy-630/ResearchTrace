import { createNode, getNodeDetail, getRetrievableTree, setNodeStatus, setPrimary,
  updateNode } from '../tree/tree-service.js';
import { workspaceRoot } from './project-tools.js';
import { recordDecision } from '../decision/decision-service.js';

const nodeProperties = {
  type: { type: 'string', enum: ['research_question', 'method', 'experiment_group'] },
  parentId: { type: 'string' }, name: { type: 'string' }, motivation: { type: 'string' },
  summary: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } },
};

function definition(name, description, properties, required, operation, workspaceRegistry) {
  return { name, description, parameters: { type: 'object', additionalProperties: false,
    properties, required }, output: { schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(input, exec) {
      const root = await workspaceRoot(exec, workspaceRegistry);
      return JSON.stringify(operation(root, input));
    } };
}

export function registerTreeTools(ctx) {
  const specs = [
    ['researchtrace_create_node', 'Create a research question, method (including a child method), or experiment group in the local research evolution tree.',
      nodeProperties, ['type', 'name'], (root, input) => createNode(root, input)],
    ['researchtrace_update_node', 'Update a research tree node name, parent, motivation, summary, or tags without moving user files.',
      { nodeId: { type: 'string' }, ...nodeProperties }, ['nodeId'],
      (root, { nodeId, ...changes }) => updateNode(root, nodeId, changes)],
    ['researchtrace_set_status', 'Set a simple research node lifecycle status. When the user gives a reason for rejection or archive, use researchtrace_record_decision or researchtrace_archive_node to preserve it.',
      { nodeId: { type: 'string' }, status: { type: 'string', enum: ['active', 'paused', 'completed', 'rejected', 'archived'] } },
      ['nodeId', 'status'], (root, input) => setNodeStatus(root, input.nodeId, input.status)],
    ['researchtrace_set_primary', 'Mark one method as primary among sibling methods. Archived or rejected methods cannot be primary.',
      { nodeId: { type: 'string' }, primary: { type: 'boolean' } }, ['nodeId'],
      (root, input) => setPrimary(root, input.nodeId, input.primary !== false)],
    ['researchtrace_get_tree', 'Read the research tree for current routes. Archived and rejected routes are excluded by default; set explicit flags only for historical lookup.',
      { includeArchived: { type: 'boolean' }, includeRejected: { type: 'boolean' } }, [],
      (root, input) => getRetrievableTree(root, input)],
    ['researchtrace_get_node_detail', 'Read a node, lineage, children, and relevant runs, including archived historical nodes when explicitly named.',
      { nodeId: { type: 'string' } }, ['nodeId'], (root, input) => getNodeDetail(root, input.nodeId)],
    ['researchtrace_restore_node', 'Restore an archived or rejected research route to active and record the user reason. Does not move files.',
      { nodeId: { type: 'string' }, rawUserText: { type: 'string' },
        summary: { type: 'string' }, reason: { type: 'string' } }, ['nodeId', 'rawUserText'],
      (root, input) => recordDecision(root, { ...input, type: 'reopen' })],
  ];
  const disposers = specs.map(([name, description, properties, required, operation]) =>
    ctx.tools.register(definition(name, description, properties, required, operation, ctx.workspaceRegistry)));
  return () => { for (const dispose of disposers.reverse()) dispose(); };
}
