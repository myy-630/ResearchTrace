import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { apply as hostApply, inject as hostInject } from '../src/host/index.js';

test('Host registers authenticated BFF route and project tools on Harness services', async () => {
  const root = mkdtempSync(join(tmpdir(), 'researchtrace-integration-'));
  const routes = [];
  const tools = [];
  const disposers = [];
  try {
    const ctx = {
      connection: { fetch: { register(route) { routes.push(route); return () => {}; } } },
      workspaceRegistry: {
        get(id) { return id === 'workspace-1' ? { path: root } : undefined; },
        list() { return []; },
        async resolveByPath(path) { return path === root ? { path: root } : undefined; },
      },
      tools: { register(tool) { tools.push(tool); return () => {}; } },
      effect(register) { disposers.push(register()); },
    };
    assert.deepEqual(hostInject, ['connection', 'workspaceRegistry', 'tools', 'llm']);
    hostApply(ctx);
    assert.equal(routes.length, 7);
    assert.equal(routes[0].path, '/api/researchtrace/project');
    assert.equal(routes[2].path, '/api/researchtrace/tree');
    assert.equal(routes[3].path, '/api/researchtrace/decisions');
    assert.equal(routes[4].path, '/api/researchtrace/paper');
    assert.equal(routes[5].path, '/api/researchtrace/trace');
    assert.equal(routes[6].path, '/api/researchtrace/audit');
    assert.deepEqual(tools.map((tool) => tool.name), [
      'researchtrace_init_project', 'researchtrace_get_project_state', 'researchtrace_run_experiment',
      'researchtrace_create_node', 'researchtrace_update_node', 'researchtrace_set_status',
      'researchtrace_set_primary', 'researchtrace_get_tree', 'researchtrace_get_node_detail',
      'researchtrace_restore_node',
      'researchtrace_search', 'researchtrace_record_decision', 'researchtrace_archive_node',
      'researchtrace_parse_document', 'researchtrace_list_claims',
      'researchtrace_trace_claim', 'researchtrace_confirm_claim_link',
      'researchtrace_run_audit', 'researchtrace_get_audit_report',
    ]);
    const request = (action, workspaceId = 'workspace-1') => new Request('http://localhost/api/researchtrace/project', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, workspaceId }),
    });
    assert.equal((await (await routes[0].fetch(request('state'))).json()).initialized, false);
    const initialized = await (await routes[0].fetch(request('init'))).json();
    assert.equal(initialized.initialized, true);
    assert.equal((await (await routes[0].fetch(request('state'))).json()).project.id,
      initialized.project.id);
    assert.equal((await routes[0].fetch(request('init', 'unknown'))).status, 404);
    const byTool = await tools[1].execute({}, { agent: { session: { header: { cwd: root } } } });
    assert.equal(JSON.parse(byTool).project.id, initialized.project.id);
  } finally {
    for (const dispose of disposers.reverse()) await dispose();
    rmSync(root, { recursive: true, force: true });
  }
});

test('Client registers a real right Sidebar tab type and keyed body', async () => {
  let module;
  const previousWindow = globalThis.window;
  globalThis.window = { __ModuleLoader__: { load(value) { module = value; } } };
  try {
    await import(`../src/client/index.js?test=${Date.now()}`);
    assert.equal(module.id, '@local/researchtrace');
    const plugin = module.factory((name) => {
      assert.equal(name, 'react');
      return { createElement(type, props, ...children) { return { type, props: props ?? {}, children }; } };
    });
    const types = [];
    const entries = [];
    const ctx = {
      locale: { register() { return () => {}; }, bind() { return (key) => key; } },
      sidebarRightTabs: { register(definition) { types.push(definition); return () => {}; } },
      sidebarRight: { openTab(kind, options) { opened.push({ kind, options }); } },
      slots: {
        inject(_name, register) { register(); return () => {}; },
        register(options, body) { entries.push({ options, body }); return () => {}; },
      },
      effect(register) { register(); },
    };
    const opened = [];
    plugin.apply(ctx);
    assert.equal(types[0].kind, 'researchtrace');
    assert.equal(types[0].guide[0].id, 'project');
    assert.equal(entries[0].options.name, 'sidebar.right.pane.tab');
    assert.equal(entries[0].options.key, types[0].id);
    assert.equal(typeof entries[0].body, 'function');
    assert.equal(entries.filter((entry) => entry.options.name === 'tool.call.toolview').length, 7);
    assert.deepEqual(plugin.inject, ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale']);
    const samples = [
      ['researchtrace_run_experiment', { id: 'run-1' }, { view: 'detail', runId: 'run-1', nodeId: 'run-1' }],
      ['researchtrace_parse_document', { document: { id: 'paper-1' } }, { view: 'detail', documentId: 'paper-1' }],
      ['researchtrace_trace_claim', { claim: { id: 'claim-1', documentId: 'paper-1' } },
        { view: 'detail', documentId: 'paper-1', claimId: 'claim-1' }],
      ['researchtrace_run_audit', { id: 'audit-1', documentId: 'paper-1' },
        { view: 'audit', documentId: 'paper-1', auditId: 'audit-1' }],
    ];
    for (const [name, result, expected] of samples) {
      const entry = entries.find((item) => item.options.key === name);
      const card = entry.body({ phase: 'result', toolName: name,
        block: { content: [{ type: 'text', text: JSON.stringify(result) }] },
        sidebarRight: ctx.sidebarRight, t: (key) => key });
      const button = card.children.find((child) => child?.type === 'button');
      assert.equal(button.children[0], 'openSidebar');
      button.props.onClick();
      assert.deepEqual(opened.at(-1), { kind: 'researchtrace', options: { params: expected } });
    }
  } finally {
    globalThis.window = previousWindow;
  }
});
