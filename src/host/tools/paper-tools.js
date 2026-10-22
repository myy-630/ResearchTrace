import { parseAndStoreDocument, listClaims, listDocuments } from '../paper/document-service.js';
import { extractClaimsWithHarness } from '../paper/extract.js';
import { workspaceRoot } from './project-tools.js';

function tool(ctx, name, description, properties, required, action) {
  return ctx.tools.register({ name, description,
    parameters: { type: 'object', additionalProperties: false, properties, required },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(input, exec) {
      const root = await workspaceRoot(exec, ctx.workspaceRegistry);
      return JSON.stringify(await action(root, input, exec));
    } });
}

export function registerPaperTools(ctx) {
  const disposers = [
    tool(ctx, 'researchtrace_parse_document',
      'Parse a local Markdown, LaTeX, or Word paper and extract structured claims through the current Harness model. Claims retain source locations. Re-running unchanged files uses the content-hash cache.',
      { path: { type: 'string', description: 'Paper file path inside the current workspace.' } }, ['path'],
      (root, input, exec) => parseAndStoreDocument(root, input.path,
        (segments) => extractClaimsWithHarness(ctx, exec, segments))),
    tool(ctx, 'researchtrace_list_claims',
      'List locally parsed paper documents or claims, including source locations and status.',
      { documentId: { type: 'string' }, listDocuments: { type: 'boolean' } }, [],
      (root, input) => input.listDocuments ? listDocuments(root) : listClaims(root, input.documentId ?? null)),
  ];
  return () => { for (const dispose of disposers.reverse()) dispose(); };
}
