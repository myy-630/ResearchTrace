window.__ModuleLoader__.load({
  id: '@local/researchtrace',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'researchtrace';
    const KIND = 'researchtrace';
    const ID = '@local/researchtrace';
    const copy = {
      en: {
        title: 'ResearchTrace',
        guideTitle: 'ResearchTrace',
        guideDescription: 'Research project provenance and audit',
        noWorkspace: 'Open a Harness workspace to use ResearchTrace.',
        loading: 'Loading project…',
        empty: 'ResearchTrace is not initialized for this workspace.',
        initialize: 'Initialize project',
        initializing: 'Initializing…',
        ready: 'Project initialized',
        database: 'Local database',
        refresh: 'Refresh',
        error: 'ResearchTrace could not load the project.',
      },
      zh: {
        title: 'ResearchTrace',
        guideTitle: 'ResearchTrace',
        guideDescription: '研究项目溯源与审计',
        noWorkspace: '请先打开 Harness 工作区。',
        loading: '正在读取项目…',
        empty: '当前工作区尚未初始化 ResearchTrace。',
        initialize: '初始化项目',
        initializing: '正在初始化…',
        ready: '项目已初始化',
        database: '本地数据库',
        refresh: '刷新',
        error: '无法读取 ResearchTrace 项目。',
      },
    };
    const panelStyle = {
      padding: '16px',
      color: 'var(--dsw-alias-label-primary)',
      fontFamily: 'inherit',
      fontSize: '13px',
      lineHeight: 1.5,
    };
    const secondaryStyle = { color: 'var(--dsw-alias-label-secondary)' };
    const buttonStyle = {
      border: '1px solid var(--dsw-alias-border-l3)',
      borderRadius: '8px',
      padding: '7px 10px',
      color: 'var(--dsw-alias-label-primary)',
      background: 'var(--dsw-alias-bg-layer-1)',
      cursor: 'pointer',
      font: 'inherit',
    };

    async function callProject(action, workspaceId, signal) {
      const response = await window.fetch('/api/researchtrace/project', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action, workspaceId }),
        signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      return body;
    }

    function ResearchTraceBody({ sessionId, useSessions, useWorkspaces, t, useTabInfo, loadProject }) {
      const { tab } = useTabInfo();
      const cwd = useSessions((sessions) => sessions.byId[sessionId]?.cwd);
      const workspaceId = useWorkspaces((workspaces) => {
        const item = workspaces.items.find((workspace) =>
          workspace.sessionIds.includes(sessionId) || workspace.path === cwd);
        return item?.workspaceId;
      });
      const [state, setState] = React.useState({ kind: 'loading' });

      React.useEffect(() => {
        if (!workspaceId) {
          setState({ kind: 'no-workspace' });
          return;
        }
        const controller = new AbortController();
        setState({ kind: 'loading' });
        loadProject('state', workspaceId, controller.signal)
          .then((value) => { if (!controller.signal.aborted) setState({ kind: 'ready', value }); })
          .catch((error) => {
            if (!controller.signal.aborted) setState({ kind: 'error', message: String(error) });
          });
        return () => controller.abort();
      }, [workspaceId, loadProject]);

      React.useEffect(() => tab.actions.bindCommands({
        refresh: () => {
          if (!workspaceId) return;
          setState({ kind: 'loading' });
          loadProject('state', workspaceId)
            .then((value) => setState({ kind: 'ready', value }))
            .catch((error) => setState({ kind: 'error', message: String(error) }));
        },
      }), [tab.actions, workspaceId, loadProject]);

      const initialize = () => {
        if (!workspaceId) return;
        setState({ kind: 'initializing' });
        loadProject('init', workspaceId)
          .then((value) => setState({ kind: 'ready', value }))
          .catch((error) => setState({ kind: 'error', message: String(error) }));
      };
      let content;
      if (state.kind === 'no-workspace') content = h('p', { style: secondaryStyle }, t('noWorkspace'));
      else if (state.kind === 'loading') content = h('p', { style: secondaryStyle }, t('loading'));
      else if (state.kind === 'initializing') content = h('p', { style: secondaryStyle }, t('initializing'));
      else if (state.kind === 'error') content = h('p', { role: 'alert' }, `${t('error')} ${state.message}`);
      else if (!state.value.initialized) content = h(React.Fragment, null,
        h('p', { style: secondaryStyle }, t('empty')),
        h('button', { type: 'button', style: buttonStyle, onClick: initialize }, t('initialize')));
      else content = h(React.Fragment, null,
        h('p', null, t('ready')),
        h('p', { style: secondaryStyle }, state.value.project.name),
        h('p', { style: secondaryStyle }, `${t('database')}: ${state.value.databasePath}`));
      return h('section', { style: panelStyle, 'aria-label': t('title') },
        h('h2', { style: { fontSize: '15px', margin: '0 0 12px' } }, t('title')),
        content);
    }

    return {
      inject: ['slots', 'sidebarRightTabs', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, copy), 'researchtrace: locale');
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: ID,
          kind: KIND,
          priority: 'extension',
          title: () => t('title'),
          guide: [{
            id: 'project',
            order: 80,
            title: () => t('guideTitle'),
            description: () => t('guideDescription'),
          }],
        }), 'researchtrace: right sidebar tab');
        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: ID,
          locale: NS,
          inject: () => ({ loadProject: callProject }),
        }, ResearchTraceBody)), 'researchtrace: sidebar body');
      },
    };
  },
});
