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
        runs: 'Recent runs', noRuns: 'No experiments recorded yet.', metricsMissing: 'Metrics not collected',
        config: 'Config', git: 'Git', metrics: 'Metrics', assets: 'Assets', dataset: 'Dataset / split',
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
        runs: '最近实验', noRuns: '尚未记录实验。', metricsMissing: '结果未收集',
        config: '配置', git: 'Git', metrics: '指标', assets: '产物', dataset: '数据 / 划分',
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

    async function callApi(path, payload, signal) {
      const response = await window.fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
        signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      return body;
    }

    const callProject = (action, workspaceId, signal) =>
      callApi('/api/researchtrace/project', { action, workspaceId }, signal);
    const loadRuns = (action, workspaceId, runId, signal) =>
      callApi('/api/researchtrace/runs', { action, workspaceId, runId }, signal);

    function facts(label, value) {
      return h('div', { style: { marginTop: '10px' } },
        h('strong', null, label),
        h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', font: '11px/1.5 monospace' } },
          typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
    }

    function ResearchTraceBody({ sessionId, useSessions, useWorkspaces, t, useTabInfo, loadProject, loadRuns }) {
      const { tab } = useTabInfo();
      const cwd = useSessions((sessions) => sessions.byId[sessionId]?.cwd);
      const workspaceId = useWorkspaces((workspaces) => {
        const item = workspaces.items.find((workspace) =>
          workspace.sessionIds.includes(sessionId) || workspace.path === cwd);
        return item?.workspaceId;
      });
      const [state, setState] = React.useState({ kind: 'loading' });
      const [runs, setRuns] = React.useState([]);
      const [selectedRunId, setSelectedRunId] = React.useState(null);
      const [runDetail, setRunDetail] = React.useState(null);

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

      React.useEffect(() => {
        if (!workspaceId || state.kind !== 'ready' || !state.value.initialized) {
          setRuns([]);
          return;
        }
        let active = true;
        const refresh = () => loadRuns('list', workspaceId)
          .then((value) => { if (active) setRuns(value.runs); })
          .catch(() => { if (active) setRuns([]); });
        refresh();
        const timer = setInterval(refresh, 2000);
        return () => { active = false; clearInterval(timer); };
      }, [workspaceId, state.kind, state.value?.initialized, loadRuns]);

      React.useEffect(() => {
        if (!workspaceId || !selectedRunId) { setRunDetail(null); return; }
        let active = true;
        loadRuns('detail', workspaceId, selectedRunId)
          .then((value) => { if (active) setRunDetail(value.run); })
          .catch(() => { if (active) setRunDetail(null); });
        return () => { active = false; };
      }, [workspaceId, selectedRunId, runs, loadRuns]);

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
        h('p', { style: { ...secondaryStyle, overflowWrap: 'anywhere' } }, `${t('database')}: ${state.value.databasePath}`),
        h('h3', { style: { margin: '20px 0 8px', fontSize: '13px' } }, t('runs')),
        runs.length ? h('ul', { style: { listStyle: 'none', padding: 0 } }, ...runs.map((run) =>
          h('li', { key: run.id, style: { marginBottom: '6px' } },
            h('button', { type: 'button', style: { ...buttonStyle, width: '100%', textAlign: 'left' },
              onClick: () => setSelectedRunId(run.id) },
            `${run.name} · ${run.status}${run.metricsStatus === 'missing' ? ` · ${t('metricsMissing')}` : ''}`))))
          : h('p', { style: secondaryStyle }, t('noRuns')),
        runDetail && h('div', { 'aria-label': runDetail.name,
          style: { borderTop: '1px solid var(--dsw-alias-border-l3)', marginTop: '14px', paddingTop: '10px' } },
        h('strong', null, `${runDetail.name} · ${runDetail.status}`),
        facts(t('config'), runDetail.config),
        facts(t('git'), runDetail.git),
        facts(t('dataset'), runDetail.dataset),
        facts(t('metrics'), runDetail.metrics ?? t('metricsMissing')),
        facts(t('assets'), runDetail.assets)));
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
          inject: () => ({ loadProject: callProject, loadRuns }),
        }, ResearchTraceBody)), 'researchtrace: sidebar body');
      },
    };
  },
});
