import { getAuditReport, listAuditReports, runAudit } from '../audit/audit-service.js';
import { workspaceRoot } from './project-tools.js';

function tool(ctx, name, description, properties, required, action) {
  return ctx.tools.register({ name, description,
    parameters: { type: 'object', additionalProperties: false, properties, required },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(input, exec) {
      const root = await workspaceRoot(exec, ctx.workspaceRegistry);
      return JSON.stringify(action(root, input));
    } });
}

export function registerAuditTools(ctx) {
  const disposers = [
    tool(ctx, 'researchtrace_run_audit',
      'Run deterministic A–H paper consistency rules against confirmed local experiment evidence. Creates a local SQLite audit session and Markdown/JSON reports; archived evidence is flagged, and unconfirmed claims are not treated as proven matches.',
      { documentId: { type: 'string' }, tolerance: { type: 'number', minimum: 0, maximum: 1 } },
      ['documentId'], (root, input) => runAudit(root, input.documentId, input)),
    tool(ctx, 'researchtrace_get_audit_report',
      'Read a persisted local ResearchTrace audit report or list audit sessions for a paper.',
      { sessionId: { type: 'string' }, documentId: { type: 'string' } }, [],
      (root, input) => input.sessionId ? getAuditReport(root, input.sessionId)
        : listAuditReports(root, input.documentId ?? null)),
  ];
  return () => { for (const dispose of disposers.reverse()) dispose(); };
}
