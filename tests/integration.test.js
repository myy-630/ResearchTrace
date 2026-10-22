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
        async resolveByPath(path) { return path === root ? { path: root } : undefined; },
      },
      tools: { register(tool) { tools.push(tool); return () => {}; } },
      effect(register) { disposers.push(register()); },
    };
    assert.deepEqual(hostInject, ['connection', 'workspaceRegistry', 'tools']);
    hostApply(ctx);
    assert.equal(routes.length, 1);
    assert.equal(routes[0].path, '/api/researchtrace/project');
    assert.deepEqual(tools.map((tool) => tool.name), [
      'researchtrace_init_project', 'researchtrace_get_project_state',
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
      return { createElement() {} };
    });
    const types = [];
    const entries = [];
    const ctx = {
      locale: { register() { return () => {}; }, bind() { return (key) => key; } },
      sidebarRightTabs: { register(definition) { types.push(definition); return () => {}; } },
      slots: {
        inject(_name, register) { register(); return () => {}; },
        register(options, body) { entries.push({ options, body }); return () => {}; },
      },
      effect(register) { register(); },
    };
    plugin.apply(ctx);
    assert.equal(types[0].kind, 'researchtrace');
    assert.equal(types[0].guide[0].id, 'project');
    assert.equal(entries[0].options.name, 'sidebar.right.pane.tab');
    assert.equal(entries[0].options.key, types[0].id);
    assert.equal(typeof entries[0].body, 'function');
  } finally {
    globalThis.window = previousWindow;
  }
});
