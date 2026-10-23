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
        tree: 'Research tree', noNodes: 'No research nodes yet.', detail: 'Node detail',
        archive: 'Archive', restore: 'Restore', primary: 'Set primary',
        motivation: 'Motivation', summary: 'Summary', childRuns: 'Related runs',
        decisions: 'Decisions',
        papers: 'Papers', noPapers: 'No paper documents parsed yet.', claims: 'Claims',
        noClaims: 'No claims extracted.', source: 'Source location',
        trace: 'Trace evidence', traceLoading: 'Tracing claim…', noTrace: 'No run evidence yet.',
        candidates: 'Candidate runs', confirm: 'Confirm this run', evidence: 'Evidence chain',
        audit: 'Audit report', runAudit: 'Run audit', noAudit: 'No audit report yet.',
        findings: 'Findings', openClaim: 'View claim', openRun: 'View run',
        treeView: 'Tree', detailView: 'Details', auditView: 'Audit',
        openSidebar: 'View in ResearchTrace', askChat: 'Ask in Chat',
        noSelection: 'Select a tree node, run, or paper to see details.',
        runLoading: 'Loading run…', runError: 'Could not load runs.',
        documentError: 'Could not load papers.', auditError: 'Could not load audits.',
        command: 'Command', status: 'Status', nextStep: 'Next step',
        children: 'Children', related: 'Related', ruleGroups: 'Rule categories',
        variables: 'Variables',
        backTree: 'Back to research tree', auditPaper: 'Audit paper', selectPaper: 'Select paper',
        questionType: 'Research question', methodType: 'Method', groupType: 'Experiment group',
        runType: 'Single run', basicInfo: 'Basic information', parentNode: 'Parent',
        createdAt: 'Created', description: 'Description', keyExperiments: 'Key experiments',
        relatedClaims: 'Related paper claims', viewAll: 'View all', latestReport: 'Audit report',
        reportComplete: 'Audit completed', reportSummary: 'Deterministic checks of paper claims and experiment evidence.',
        severeIssues: 'Errors', warnings: 'Warnings', verifiedItems: 'Information',
        noIssues: 'No findings in this category.', paperIntro: 'Compare paper claims with recorded experiments.',
        auditHistory: 'Previous reports', noDescription: 'No description recorded.',
        activeStatus: 'Active', pausedStatus: 'Paused', completedStatus: 'Completed',
        rejectedStatus: 'Rejected', archivedStatus: 'Archived', createdStatus: 'Created',
        runningStatus: 'Running', succeededStatus: 'Succeeded', failedStatus: 'Failed',
        cancelledStatus: 'Cancelled', interruptedStatus: 'Interrupted',
        closeTree: 'Close research tree', closeDetail: 'Close details',
        closeAudit: 'Close paper audit',
        adoptedInPaper: 'Used as paper evidence', auditUsedRuns: 'Runs used in this audit',
        olderAuditNoRunList: 'This older report has no saved run list. Run the audit again to mark runs.',
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
        tree: '研究演化树', noNodes: '尚无研究节点。', detail: '节点详情',
        archive: '归档', restore: '恢复', primary: '设为主路线',
        motivation: '动机', summary: '摘要', childRuns: '相关实验',
        decisions: '科研决策',
        papers: '论文文档', noPapers: '尚未解析论文文档。', claims: '论文主张',
        noClaims: '尚无已抽取主张。', source: '原文位置',
        trace: '溯源证据', traceLoading: '正在匹配主张…', noTrace: '尚无实验溯源。',
        candidates: '候选实验', confirm: '确认此实验', evidence: '证据链',
        audit: '审计报告', runAudit: '运行审计', noAudit: '尚无审计报告。',
        findings: '审计发现', openClaim: '查看主张', openRun: '查看实验',
        treeView: '演化树', detailView: '详情', auditView: '审计',
        openSidebar: '在 ResearchTrace 中查看', askChat: '在聊天中询问',
        noSelection: '选择研究节点、实验或论文查看详情。',
        runLoading: '正在读取实验…', runError: '无法读取实验。',
        documentError: '无法读取论文。', auditError: '无法读取审计。',
        command: '命令', status: '状态', nextStep: '下一步',
        children: '子节点', related: '关联', ruleGroups: '规则分类',
        variables: '变量',
        backTree: '返回演化树', auditPaper: '审计论文', selectPaper: '选择论文',
        questionType: '研究问题', methodType: '方法', groupType: '实验组',
        runType: '单次运行', basicInfo: '基本信息', parentNode: '父节点',
        createdAt: '创建时间', description: '描述', keyExperiments: '关键实验',
        relatedClaims: '关联论文结论', viewAll: '查看全部', latestReport: '审计报告',
        reportComplete: '审计完成', reportSummary: '根据论文主张和实验记录执行确定性核对。',
        severeIssues: '严重问题', warnings: '警告', verifiedItems: '提示',
        noIssues: '此类暂无审计发现。', paperIntro: '将论文中的关键结论与研究演化树中的实验结果对照验证。',
        auditHistory: '历史报告', noDescription: '尚未记录描述。',
        activeStatus: '进行中', pausedStatus: '已暂停', completedStatus: '已完成',
        rejectedStatus: '已否决', archivedStatus: '已归档', createdStatus: '已创建',
        runningStatus: '运行中', succeededStatus: '成功', failedStatus: '失败',
        cancelledStatus: '已取消', interruptedStatus: '已中断',
        closeTree: '关闭演化树', closeDetail: '关闭详情',
        closeAudit: '关闭论文审计',
        adoptedInPaper: '论文采用', auditUsedRuns: '本次审计采用的运行',
        olderAuditNoRunList: '旧审计报告未保存采用的运行清单；重新运行审计后可标注。',
      },
    };
    const panelStyle = {
      display: 'flex',
      width: '100%',
      height: '100%',
      minHeight: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
      color: 'var(--dsw-alias-label-primary)',
      fontFamily: 'inherit',
      fontSize: '14px',
      lineHeight: 1.55,
    };
    const paneStyle = {
      boxSizing: 'border-box',
      flex: '1 1 0',
      minWidth: 0,
      minHeight: 0,
      overflowY: 'auto',
      padding: '12px 14px 24px',
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
    const cardStyle = {
      border: '1px solid var(--dsw-alias-border-l3)',
      borderRadius: '10px',
      background: 'var(--dsw-alias-bg-layer-1)',
      padding: '13px 14px',
      marginTop: '11px',
    };
    const blueButtonStyle = {
      ...buttonStyle, width: '100%', border: 'none', padding: '10px 12px',
      borderRadius: '8px', background: '#2f6df6', color: '#fff', fontWeight: 650,
    };
    const iconPaths = {
      question: ['M9 18h6', 'M10 22h4', 'M8 14.5a7 7 0 1 1 8 0c-1.1.8-1.5 1.5-1.5 3h-5c0-1.5-.4-2.2-1.5-3Z'],
      method: ['M12 2 21 7v10l-9 5-9-5V7l9-5Z', 'M3 7l9 5 9-5', 'M12 12v10'],
      group: ['M9 3h6', 'M10 3v7L5 18a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-8V3', 'M8 15h8'],
      document: ['M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z', 'M14 2v6h5', 'M8 13h8', 'M8 17h8'],
      check: ['M5 12l4 4L19 6'], x: ['M6 6l12 12', 'M18 6 6 18'],
      arrow: ['M19 12H5', 'M12 19l-7-7 7-7'], chevron: ['M9 18l6-6-6-6'],
      alert: ['M12 3 2 21h20L12 3Z', 'M12 9v5', 'M12 18h.01'],
    };
    function icon(name, color = 'currentColor', size = 18) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { flex: 'none', verticalAlign: 'middle' } },
      ...(iconPaths[name] ?? iconPaths.method).map((d) => h('path', { key: d, d })));
    }
    const typeKeys = { research_question: 'questionType', method: 'methodType',
      experiment_group: 'groupType', run: 'runType' };
    const typeIcons = { research_question: 'question', method: 'method',
      experiment_group: 'group', run: 'method' };
    function statusLabel(t, status) { return t(`${status}Status`); }
    function statusPill(t, status) {
      const colors = {
        succeeded: ['#e9f8ef', '#148451'], completed: ['#e9f8ef', '#148451'],
        running: ['#eaf2ff', '#2867df'], active: ['#eaf2ff', '#2867df'],
        failed: ['#fff0f0', '#d73535'], rejected: ['#fff0f0', '#d73535'],
        paused: ['#fff7e7', '#a96700'], interrupted: ['#fff7e7', '#a96700'],
      };
      const [background, color] = colors[status] ?? ['#f3f4f6', '#626b79'];
      return h('span', { style: { background, color, borderRadius: '6px',
        padding: '2px 7px', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' } },
      statusLabel(t, status));
    }
    function formatTime(value) {
      if (!value) return '—';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined,
        { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    function card(title, body, extra = null) {
      return h('section', { style: cardStyle },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px', fontWeight: 700, marginBottom: '9px', fontSize: '13px' } },
        h('span', null, title), extra), body);
    }
    function detailRow(label, value) {
      return h('div', { style: { display: 'grid', gridTemplateColumns: '82px minmax(0, 1fr)',
        gap: '8px', padding: '3px 0' } },
        h('span', { style: secondaryStyle }, label),
        h('span', { style: { overflowWrap: 'anywhere' } }, value ?? '—'));
    }

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
    const callTree = (action, workspaceId, payload = {}, signal) =>
      callApi('/api/researchtrace/tree', { action, workspaceId, ...payload }, signal);
    const callDecision = (action, workspaceId, payload = {}, signal) =>
      callApi('/api/researchtrace/decisions', { action, workspaceId, ...payload }, signal);
    const callPaper = (action, workspaceId, payload = {}, signal) =>
      callApi('/api/researchtrace/paper', { action, workspaceId, ...payload }, signal);
    const callTrace = (action, workspaceId, payload = {}, signal) =>
      callApi('/api/researchtrace/trace', { action, workspaceId, ...payload }, signal);
    const callAudit = (action, workspaceId, payload = {}, signal) =>
      callApi('/api/researchtrace/audit', { action, workspaceId, ...payload }, signal);

    function facts(label, value) {
      return h('div', { style: { marginTop: '10px' } },
        h('strong', null, label),
        h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', font: '11px/1.5 monospace' } },
          typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
    }

    function foldedFacts(label, value) {
      return h('details', { style: { marginTop: '8px' } },
        h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, label),
        h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', font: '11px/1.5 monospace' } },
          typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
    }

    function toolNavigation(toolName, result) {
      if (!result || typeof result !== 'object') return null;
      if (toolName === 'researchtrace_run_experiment') {
        const runId = result.id ?? result.run?.id;
        return runId ? { view: 'detail', runId, nodeId: runId } : null;
      }
      if (toolName === 'researchtrace_parse_document') {
        const documentId = result.document?.id;
        return documentId ? { view: 'detail', documentId } : null;
      }
      if (toolName === 'researchtrace_trace_claim') {
        const claimId = result.claim?.id;
        return claimId ? { view: 'detail', documentId: result.claim.documentId, claimId } : null;
      }
      if (toolName === 'researchtrace_run_audit' || toolName === 'researchtrace_get_audit_report') {
        return result.id ? { view: 'audit', documentId: result.documentId, auditId: result.id } : null;
      }
      if (toolName === 'researchtrace_get_node_detail' || toolName === 'researchtrace_create_node') {
        const nodeId = result.node?.id ?? result.id;
        return nodeId ? { view: 'detail', nodeId } : null;
      }
      return null;
    }

    function ResearchTraceToolCard({ phase, block, toolName, sidebarRight, t }) {
      const result = phase === 'result' && !block.isError
        ? block.content?.find((item) => item.type === 'text')?.text : null;
      let navigation = null;
      if (result) {
        try { navigation = toolNavigation(toolName, JSON.parse(result)); } catch { /* generic result */ }
      }
      return h('div', { style: { ...buttonStyle, margin: '4px 0', cursor: 'default' } },
        h('strong', null, `ResearchTrace · ${toolName.replace('researchtrace_', '').replaceAll('_', ' ')}`),
        phase !== 'result' && h('span', { style: { ...secondaryStyle, marginLeft: '8px' } }, '…'),
        phase === 'result' && block.isError && h('p', { role: 'alert' }, result ?? String(block.isError)),
        navigation && h('button', { type: 'button', style: { ...buttonStyle, marginLeft: '8px' },
          onClick: () => sidebarRight.openTab(KIND, { params: navigation }) }, t('openSidebar')));
    }

    function ResearchTraceBody({ sessionId, useSessions, useWorkspaces, useInput, inputActions,
      t, useTabInfo, loadProject, loadRuns, callTree, callDecision, callPaper, callTrace, callAudit }) {
      const { tab } = useTabInfo();
      const cwd = useSessions((sessions) => sessions.byId[sessionId]?.cwd);
      const workspaceId = useWorkspaces((workspaces) => {
        const item = workspaces.items.find((workspace) =>
          workspace.sessionIds.includes(sessionId) || workspace.path === cwd);
        return item?.workspaceId;
      });
      const [state, setState] = React.useState({ kind: 'loading' });
      const [runs, setRuns] = React.useState([]);
      const [runsState, setRunsState] = React.useState('loading');
      const [selectedRunId, setSelectedRunId] = React.useState(null);
      const [runDetail, setRunDetail] = React.useState(null);
      const [runDetailState, setRunDetailState] = React.useState('empty');
      const [tree, setTree] = React.useState({ roots: [], nodes: [] });
      const [treeState, setTreeState] = React.useState('loading');
      const [selectedNodeId, setSelectedNodeId] = React.useState(null);
      const [nodeDetail, setNodeDetail] = React.useState(null);
      const [nodeDetailState, setNodeDetailState] = React.useState('empty');
      const [expanded, setExpanded] = React.useState({});
      const [treeError, setTreeError] = React.useState(null);
      const [documents, setDocuments] = React.useState([]);
      const [documentsState, setDocumentsState] = React.useState('loading');
      const [selectedDocumentId, setSelectedDocumentId] = React.useState(null);
      const [claims, setClaims] = React.useState([]);
      const [claimsState, setClaimsState] = React.useState('empty');
      const [selectedClaimId, setSelectedClaimId] = React.useState(null);
      const [traceState, setTraceState] = React.useState({ kind: 'empty' });
      const [auditSessions, setAuditSessions] = React.useState([]);
      const [auditState, setAuditState] = React.useState({ kind: 'empty' });
      const [selectedFindingId, setSelectedFindingId] = React.useState(null);
      const [view, setView] = React.useState('tree');
      const [treeOpen, setTreeOpen] = React.useState(true);
      const draft = useInput((input) => input.draft);

      const selectDocument = (documentId) => {
        setSelectedDocumentId(documentId || null);
        setSelectedClaimId(null);
        setClaims([]);
        setClaimsState(documentId ? 'loading' : 'empty');
        setAuditState({ kind: 'empty' });
        setSelectedFindingId(null);
      };

      const navigate = (destination, selection = {}) => {
        setView(destination);
        if (destination === 'tree') setTreeOpen(true);
        if (selection.nodeId || selection.runId) {
          setSelectedDocumentId(null);
          setSelectedClaimId(null);
        }
        if (selection.documentId || selection.claimId) {
          setSelectedNodeId(null);
          setSelectedRunId(null);
        }
        if (selection.nodeId) setSelectedNodeId(selection.nodeId);
        if (selection.runId) setSelectedRunId(selection.runId);
        if (selection.documentId && selection.documentId !== selectedDocumentId) {
          selectDocument(selection.documentId);
        }
        if (selection.claimId) setSelectedClaimId(selection.claimId);
        if (selection.auditId) auditAction('report', { sessionId: selection.auditId });
      };

      React.useEffect(() => {
        const params = tab.navigation?.params;
        if (!params || tab.navigation.revision === 0) return;
        navigate(['tree', 'detail', 'audit'].includes(params.view) ? params.view : 'tree', params);
      }, [tab.navigation?.revision]);

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
        setRunsState('loading');
        const refresh = () => loadRuns('list', workspaceId)
          .then((value) => { if (active) { setRuns(value.runs); setRunsState('ready'); } })
          .catch(() => { if (active) setRunsState('error'); });
        refresh();
        const timer = setInterval(refresh, 2000);
        return () => { active = false; clearInterval(timer); };
      }, [workspaceId, state.kind, state.value?.initialized, loadRuns]);

      React.useEffect(() => {
        if (!workspaceId || !selectedRunId) { setRunDetail(null); setRunDetailState('empty'); return; }
        let active = true;
        setRunDetail((current) => current?.id === selectedRunId ? current : null);
        setRunDetailState((current) => current === 'ready' && runDetail?.id === selectedRunId
          ? 'ready' : 'loading');
        loadRuns('detail', workspaceId, selectedRunId)
          .then((value) => { if (active) { setRunDetail(value.run); setRunDetailState('ready'); } })
          .catch(() => { if (active) setRunDetailState('error'); });
        return () => { active = false; };
      }, [workspaceId, selectedRunId, runs, loadRuns]);

      React.useEffect(() => {
        if (!workspaceId || state.kind !== 'ready' || !state.value.initialized) {
          setTree({ roots: [], nodes: [] });
          return;
        }
        let active = true;
        setTreeState('loading');
        const refresh = () => callTree('tree', workspaceId)
          .then(({ value }) => { if (active) { setTree(value); setTreeError(null); setTreeState('ready'); } })
          .catch((error) => { if (active) { setTreeError(String(error)); setTreeState('error'); } });
        refresh();
        const timer = setInterval(refresh, 3000);
        return () => { active = false; clearInterval(timer); };
      }, [workspaceId, state.kind, state.value?.initialized, callTree]);

      React.useEffect(() => {
        if (!workspaceId || !selectedNodeId) {
          setNodeDetail(null); setNodeDetailState('empty'); return;
        }
        let active = true;
        setNodeDetail((current) => current?.node.id === selectedNodeId ? current : null);
        setNodeDetailState((current) => current === 'ready' && nodeDetail?.node.id === selectedNodeId
          ? 'ready' : 'loading');
        callTree('detail', workspaceId, { nodeId: selectedNodeId })
          .then(({ value }) => { if (active) { setNodeDetail(value); setNodeDetailState('ready'); } })
          .catch((error) => { if (active) { setTreeError(String(error)); setNodeDetailState('error'); } });
        return () => { active = false; };
      }, [workspaceId, selectedNodeId, tree, callTree]);

      React.useEffect(() => {
        if (!workspaceId || state.kind !== 'ready' || !state.value.initialized) {
          setDocuments([]);
          return;
        }
        let active = true;
        setDocumentsState('loading');
        const refresh = () => callPaper('list', workspaceId)
          .then(({ value }) => { if (active) { setDocuments(value); setDocumentsState('ready'); } })
          .catch(() => { if (active) setDocumentsState('error'); });
        refresh();
        const timer = setInterval(refresh, 5000);
        return () => { active = false; clearInterval(timer); };
      }, [workspaceId, state.kind, state.value?.initialized, callPaper]);

      React.useEffect(() => {
        if (!workspaceId || !selectedDocumentId) { setClaims([]); setClaimsState('empty'); return; }
        let active = true;
        setClaimsState((current) => current === 'ready' ? current : 'loading');
        callPaper('claims', workspaceId, { documentId: selectedDocumentId })
          .then(({ value }) => { if (active) { setClaims(value); setClaimsState('ready'); } })
          .catch(() => { if (active) setClaimsState('error'); });
        return () => { active = false; };
      }, [workspaceId, selectedDocumentId, documents, callPaper]);

      React.useEffect(() => {
        if (!workspaceId || !selectedClaimId) { setTraceState({ kind: 'empty' }); return; }
        let active = true;
        setTraceState({ kind: 'loading' });
        callTrace('get', workspaceId, { claimId: selectedClaimId })
          .then(({ value }) => { if (active) setTraceState({ kind: 'ready', value }); })
          .catch((error) => { if (active) setTraceState({ kind: 'error', message: String(error) }); });
        return () => { active = false; };
      }, [workspaceId, selectedClaimId, callTrace]);

      React.useEffect(() => {
        if (!workspaceId || state.kind !== 'ready' || !state.value.initialized) {
          setAuditSessions([]); return;
        }
        let active = true;
        callAudit('list', workspaceId, { documentId: selectedDocumentId ?? undefined })
          .then(({ value }) => {
            if (!active) return;
            setAuditSessions(value);
            if (value.length && auditState.kind === 'empty') auditAction('report', { sessionId: value[0].id });
          })
          .catch((error) => { if (active) setAuditState({ kind: 'error', message: String(error) }); });
        return () => { active = false; };
      }, [workspaceId, state.kind, state.value?.initialized, selectedDocumentId, documents, callAudit]);

      const traceAction = (action, payload) => {
        setTraceState({ kind: 'loading' });
        callTrace(action, workspaceId, { claimId: selectedClaimId, ...payload })
          .then(({ value }) => {
            setTraceState({ kind: 'ready', value });
            setClaims((items) => items.map((claim) => claim.id === selectedClaimId
              ? { ...claim, status: value.claim.status } : claim));
          })
          .catch((error) => setTraceState({ kind: 'error', message: String(error) }));
      };

      const auditAction = (action, payload) => {
        setAuditState({ kind: 'loading' });
        callAudit(action, workspaceId, { documentId: selectedDocumentId, ...payload })
          .then(({ value }) => {
            setAuditState({ kind: 'ready', value });
            setSelectedFindingId(null);
            if (action === 'run') setAuditSessions((items) => [{ id: value.id,
              counts: value.counts, createdAt: value.createdAt }, ...items]);
          })
          .catch((error) => setAuditState({ kind: 'error', message: String(error) }));
      };

      const askChat = (kind, id, summary) => {
        const context = `[ResearchTrace ${kind}: ${id}] ${summary}`;
        const text = `${draft ? '\n\n' : ''}${context}\n`;
        const insertion = inputActions.captureInsertion();
        if (!inputActions.insertText(text, insertion)) inputActions.setDraft(`${draft ?? ''}${text}`);
      };

      const currentAuditReport = auditState.kind === 'ready' &&
        auditState.value.documentId === selectedDocumentId ? auditState.value : null;
      const auditFindings = currentAuditReport?.findings ?? [];
      const adoptedRunIds = new Set(view === 'audit' ? currentAuditReport?.usedRunIds ?? [] : []);
      const adoptedPathIds = new Set();
      const treeNodesById = new Map(tree.nodes.map((node) => [node.id, node]));
      for (const runId of adoptedRunIds) {
        let node = treeNodesById.get(runId);
        while (node && !adoptedPathIds.has(node.id)) {
          adoptedPathIds.add(node.id);
          node = treeNodesById.get(node.parentId);
        }
      }
      const findingsForNode = (node) => {
        const ids = new Set();
        const visit = (item) => { ids.add(item.id); item.children.forEach(visit); };
        visit(node);
        return auditFindings.filter((item) => item.runId && ids.has(item.runId)).length;
      };

      function renderAudit() {
        const report = auditState.kind === 'ready' ? auditState.value : null;
        const matchingReport = report?.documentId === selectedDocumentId ? report : null;
        const groups = [
          ['error', t('severeIssues'), '#d73535', '#fff2f2'],
          ['warning', t('warnings'), '#b97500', '#fff8e9'],
          ['info', t('verifiedItems'), '#138456', '#ecf9f2'],
        ];
        const ruleCounts = matchingReport?.findings.reduce((items, item) => {
          items[item.ruleId] = (items[item.ruleId] ?? 0) + 1;
          return items;
        }, {}) ?? {};
        function findingGroup([severity, label, color, background]) {
          const items = matchingReport.findings.filter((item) => item.severity === severity);
          if (!items.length) return null;
          return h('section', { key: severity, style: { ...cardStyle, padding: 0,
            borderColor: color === '#d73535' ? '#f3d4d4' : color === '#b97500' ? '#f2e2bf' : '#cee9da',
            overflow: 'hidden' } },
            h('div', { style: { background, color, padding: '9px 12px', fontWeight: 700 } },
              `${label} (${items.length})`),
            ...items.map((item, index) => h('div', { key: item.id,
              style: { borderTop: index ? '1px solid var(--dsw-alias-border-l3)' : 'none' } },
              h('button', { type: 'button', style: { width: '100%', border: 'none', background: 'transparent',
                color: 'var(--dsw-alias-label-primary)', padding: '10px 12px', textAlign: 'left',
                display: 'flex', gap: '9px', cursor: 'pointer', font: 'inherit' },
                'aria-expanded': selectedFindingId === item.id,
                onClick: () => setSelectedFindingId(selectedFindingId === item.id ? null : item.id) },
                h('span', { style: { color, fontWeight: 700 } }, `${index + 1}.`),
                h('span', { style: { flex: 1, minWidth: 0 } }, h('strong', null, item.message),
                  h('small', { style: { ...secondaryStyle, display: 'block', marginTop: '2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                    item.paperEvidence?.quote ?? item.recommendation ?? item.ruleId)),
                icon('chevron', 'var(--dsw-alias-label-secondary)', 15)),
              selectedFindingId === item.id && h('div', { 'aria-label': item.ruleId,
                style: { padding: '0 12px 12px 30px' } },
                item.paperEvidence?.quote && h('p', { style: { margin: '5px 0' } },
                  `${t('source')}: ${item.paperEvidence.quote}`),
                item.experimentEvidence?.missing?.length > 0 && h('p', { style: { margin: '5px 0' } },
                  `${t('evidence')}: ${item.experimentEvidence.missing.join(', ')}`),
                item.recommendation && h('p', null, item.recommendation),
                h('details', { style: { marginBottom: '9px' } },
                  h('summary', { style: { cursor: 'pointer', color: '#2867df' } }, t('evidence')),
                  facts(t('source'), item.paperEvidence),
                  facts(t('evidence'), item.experimentEvidence)),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  item.claimId && h('button', { type: 'button', style: buttonStyle,
                    onClick: () => navigate('detail', { claimId: item.claimId,
                      documentId: matchingReport.documentId }) }, t('openClaim')),
                  item.runId && h('button', { type: 'button', style: buttonStyle,
                    onClick: () => navigate('detail', { runId: item.runId, nodeId: item.runId }) }, t('openRun')),
                  h('button', { type: 'button', style: buttonStyle,
                    onClick: () => askChat('finding', item.id,
                      `${item.ruleId}: ${item.message}`) }, t('askChat')))))));
        }
        return h('section', { 'aria-label': t('audit') },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '9px',
            marginTop: '15px', fontSize: '18px', fontWeight: 750 } },
            icon('document', '#172033', 23), t('auditPaper')),
          h('p', { style: { ...secondaryStyle, margin: '3px 0 14px' } }, t('paperIntro')),
          card(t('selectPaper'), h(React.Fragment, null,
            documentsState === 'error' && h('p', { role: 'alert' }, t('documentError')),
            documents.length ? h('select', { 'aria-label': t('papers'), value: selectedDocumentId ?? '',
              onChange: (event) => selectDocument(event.target.value),
              style: { ...buttonStyle, width: '100%', marginBottom: '10px', overflow: 'hidden' } },
              h('option', { value: '' }, t('selectPaper')),
              ...documents.map((document) => h('option', { key: document.id, value: document.id },
                document.path.split('/').at(-1)))) : h('p', { style: secondaryStyle }, t('noPapers')),
            h('button', { type: 'button', style: blueButtonStyle,
              disabled: !selectedDocumentId || auditState.kind === 'loading',
              onClick: () => auditAction('run', {}) }, `▶  ${t('runAudit')}`))),
          auditState.kind === 'loading' && h('p', null, t('loading')),
          auditState.kind === 'error' && h('p', { role: 'alert' }, auditState.message),
          selectedDocumentId && !matchingReport && auditState.kind === 'empty' &&
            h('p', { style: secondaryStyle }, t('noAudit')),
          matchingReport && h(React.Fragment, null,
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginTop: '20px' } },
              h('h3', { style: { margin: 0, fontSize: '15px' } }, t('latestReport')),
              h('small', { style: secondaryStyle }, formatTime(matchingReport.createdAt))),
            card(t('reportComplete'), h('div', null,
              h('p', { style: { margin: '0 0 8px', ...secondaryStyle } }, t('reportSummary')),
              h('strong', null,
                `${t('severeIssues')} ${matchingReport.counts.error} · ` +
                `${t('warnings')} ${matchingReport.counts.warning} · ` +
                `${t('verifiedItems')} ${matchingReport.counts.info}`),
              Object.keys(ruleCounts).length > 0 && h('p', { style: { ...secondaryStyle,
                margin: '6px 0 0', fontSize: '11px' } },
                `${t('ruleGroups')}: ${Object.entries(ruleCounts).map(([rule, count]) =>
                  `${rule} ×${count}`).join(' · ')}`))),
            ...groups.map(findingGroup),
            !matchingReport.findings.length && h('p', { style: secondaryStyle }, t('noIssues'))),
          auditSessions.length > 1 && h('details', { style: { marginTop: '16px' } },
            h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, t('auditHistory')),
            ...auditSessions.slice(0, 10).map((session) => h('button', { key: session.id,
              type: 'button', style: { ...buttonStyle, display: 'block', width: '100%',
                textAlign: 'left', marginTop: '5px' },
              onClick: () => auditAction('report', { sessionId: session.id }) },
            `${formatTime(session.createdAt)} · E${session.counts.error} W${session.counts.warning} I${session.counts.info}`))));
      }

      const treeAction = (action, payload) => (action === 'primary' || action === 'archive' || action === 'restore'
        ? callDecision('record', workspaceId, { decision: {
          nodeId: payload.nodeId,
          type: action === 'primary' ? 'promote_to_primary' : action === 'restore' ? 'reopen' : 'archive',
          rawUserText: `ResearchTrace Sidebar: ${action}`,
          summary: `ResearchTrace Sidebar: ${action}`,
        } }) : callTree(action, workspaceId, payload))
        .then(() => callTree('tree', workspaceId))
        .then(({ value }) => { setTree(value); setTreeError(null); })
        .catch((error) => setTreeError(String(error)));

      function renderNode(node, depth = 0) {
        const compact = treeOpen && view !== 'tree';
        const adopted = node.type === 'run' && adoptedRunIds.has(node.id);
        const hasChildren = node.children.length > 0;
        const open = expanded[node.id] ?? (adoptedPathIds.has(node.id) ||
          node.type !== 'experiment_group' || node.children.length <= 5);
        const runStatus = node.executionStatus ?? runs.find((run) => run.id === node.id)?.status;
        const nodeColor = node.status === 'archived' ? '#8b93a0' : node.isPrimary ? '#2f6df6'
          : node.type === 'run' && runStatus === 'failed' ? '#e43d3d' : '#556171';
        const issueCount = findingsForNode(node);
        const count = node.type === 'experiment_group'
          ? node.children.filter((child) => child.type === 'run').length : 0;
        const nodeIcon = node.type === 'run'
          ? icon(runStatus === 'succeeded' ? 'check' : runStatus === 'failed' ? 'x' : 'method',
            runStatus === 'succeeded' ? '#1eaa68' : nodeColor, 18)
          : node.isPrimary ? h('span', { style: { color: '#2f6df6', fontSize: '20px', lineHeight: 1 } }, '★')
            : icon(typeIcons[node.type], nodeColor, 19);
        return h('li', { key: node.id, style: { listStyle: 'none', margin: '4px 0' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '5px',
            opacity: node.defaultVisible ? 1 : 0.65,
            background: selectedNodeId === node.id ? '#edf4ff' : 'transparent',
            boxShadow: adopted ? 'inset 3px 0 #1eaa68' : undefined,
            borderRadius: '8px', padding: '5px 4px' } },
            hasChildren ? h('button', { type: 'button', style: { border: 'none', background: 'transparent',
              color: '#334155', padding: '1px', width: '19px', cursor: 'pointer',
              flex: 'none', font: 'inherit', fontSize: '13px' },
              'aria-label': `${open ? 'Collapse' : 'Expand'} ${node.name}`,
              onClick: () => setExpanded((value) => ({ ...value, [node.id]: !open })) }, open ? '⌄' : '›')
              : h('span', { style: { width: '19px', flex: 'none' } }, ''),
            nodeIcon,
            h('button', { type: 'button', style: { border: 'none', padding: '2px 0', minWidth: 0,
              flex: 1, color: node.isPrimary ? '#2563eb' : 'var(--dsw-alias-label-primary)',
              textAlign: 'left', background: 'transparent', cursor: 'pointer', font: 'inherit' },
              'aria-label': `${t(typeKeys[node.type])} ${node.name}${adopted ? ` · ${t('adoptedInPaper')}` : ''}`,
              title: `${t(typeKeys[node.type])} · ${node.name}${adopted ? ` · ${t('adoptedInPaper')}` : ''}`,
              onClick: () => navigate('detail', { nodeId: node.id,
                runId: node.type === 'run' ? node.id : undefined }) },
              h('span', { style: { display: 'block', overflow: 'hidden',
                textOverflow: compact ? undefined : 'ellipsis',
                whiteSpace: compact ? 'normal' : 'nowrap',
                overflowWrap: compact ? 'anywhere' : undefined,
                lineHeight: compact ? 1.25 : undefined,
                fontSize: compact ? '12px' : undefined,
                fontWeight: node.isPrimary ? 650 : 450 } },
                `${t(typeKeys[node.type])} · ${node.name}`),
              adopted && h('span', { style: { display: 'inline-block', marginTop: '3px',
                padding: '1px 5px', borderRadius: '5px', background: '#e9f8ef',
                color: '#138456', fontWeight: 700, fontSize: '10px', lineHeight: 1.35 } },
              t('adoptedInPaper'))),
            node.type === 'run' ? statusPill(t, runStatus ?? 'created')
              : node.status === 'archived' || node.status === 'rejected' || node.status === 'paused'
                ? statusPill(t, node.status)
                : count > 0 ? h('span', { title: `${count} ${t('runType')}`,
                  style: { color: '#667085', background: '#f3f5f8', borderRadius: '6px',
                    padding: '1px 6px', fontSize: '11px' } }, String(count))
                  : issueCount > 0 ? h('span', { title: `${issueCount} ${t('findings')}`,
                    style: { color: '#ab6c00', background: '#fff7e8', borderRadius: '6px',
                      padding: '1px 6px', fontSize: '11px' } }, `⚠ ${issueCount}`) : null),
          hasChildren && open && h('ul', { style: { margin: '0 0 0 15px', padding: '0 0 0 8px',
            borderLeft: '1px dashed var(--dsw-alias-border-l3)' } },
            ...node.children.map((child) => renderNode(child, depth + 1))));
      }

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
      function renderTreePage() {
        return h('section', { 'aria-label': t('tree') },
          h('button', { type: 'button', style: { ...blueButtonStyle, margin: '9px 0 18px' },
            onClick: () => {
              if (!selectedDocumentId && documents.length) selectDocument(documents[0].id);
              setView('audit');
            } }, `${t('auditPaper')}  →`),
          h('h3', { style: { margin: '8px 0 13px', fontSize: '15px', fontWeight: 750 } }, t('tree')),
          view === 'audit' && currentAuditReport && h('p', { style: {
            margin: '-5px 0 11px', fontSize: '11px', color: '#2867df' } },
          Array.isArray(currentAuditReport.usedRunIds)
            ? `${t('auditUsedRuns')}: ${currentAuditReport.usedRunIds.length}`
            : t('olderAuditNoRunList')),
          treeState === 'loading' && h('p', null, t('loading')),
          treeError && h('p', { role: 'alert' }, treeError),
          tree.roots.length ? h('ul', { style: { margin: 0, padding: 0 } },
            ...tree.roots.map((node) => renderNode(node))) :
            treeState === 'ready' && h('p', { style: secondaryStyle }, t('noNodes')));
      }

      function renderNodeDetail() {
        if (!selectedNodeId) return null;
        if (nodeDetailState === 'loading') return h('p', null, t('loading'));
        if (nodeDetailState === 'error') return h('p', { role: 'alert' }, treeError ?? t('error'));
        if (!nodeDetail) return null;
        const { node, lineage, children, decisions, relatedClaims = [] } = nodeDetail;
        const run = selectedRunId === node.id && runDetailState === 'ready' && runDetail
          ? runDetail : nodeDetail.run;
        const parent = lineage.length > 1 ? lineage.at(-2) : null;
        const currentStatus = node.type === 'run' ? run?.status ?? 'created' : node.status;
        const groups = children.filter((child) => child.type !== 'run');
        const keyRuns = nodeDetail.runs ?? [];
        const latestDecision = decisions?.[0];
        return h('section', { 'aria-label': node.name },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '9px', marginTop: '15px' } },
            icon(typeIcons[node.type], '#172033', 24),
            h('h3', { style: { margin: 0, fontSize: '18px', minWidth: 0,
              overflowWrap: 'anywhere', flex: 1 } }, `${t(typeKeys[node.type])} · ${node.name}`),
            node.isPrimary && h('span', { title: t('primary'),
              style: { color: '#f0a020', fontSize: '21px' } }, '★')),
          node.summary && h('p', { style: { ...secondaryStyle, margin: '5px 0 14px 34px' } }, node.summary),
          card(t('basicInfo'), h('div', null,
            detailRow(t('status'), statusPill(t, currentStatus)),
            detailRow(t('createdAt'), formatTime(node.createdAt)),
            parent && detailRow(t('parentNode'), `${t(typeKeys[parent.type])} · ${parent.name}`),
            node.type === 'experiment_group' && node.tags?.length > 0 &&
              detailRow(t('variables'), node.tags.join(' · ')),
            node.type === 'run' && run?.seed != null && detailRow('Seed', String(run.seed)))),
          node.motivation && card(t('motivation'), h('p', { style: { margin: 0 } }, node.motivation)),
          (latestDecision?.summary || node.summary) && card(t('summary'),
            h('p', { style: { margin: 0, padding: '9px 11px', borderRadius: '7px',
              background: '#eef5ff' } }, latestDecision?.summary ?? node.summary)),
          groups.length > 0 && card(t('keyExperiments'), h('div', null,
            ...groups.map((child) => h('button', { key: child.id, type: 'button',
              style: { width: '100%', border: 'none', borderBottom: '1px solid var(--dsw-alias-border-l3)',
                background: 'transparent', padding: '7px 0', textAlign: 'left',
                cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', font: 'inherit' },
              onClick: () => navigate('detail', { nodeId: child.id }) },
              `${t(typeKeys[child.type])} · ${child.name}  ›`)))),
          keyRuns.length > 0 && card(`${t('childRuns')} (${keyRuns.length})`, h('div', null,
            ...keyRuns.map((item) => h('button', { key: item.id, type: 'button',
              style: { width: '100%', border: 'none',
                borderTop: '1px solid var(--dsw-alias-border-l3)', background: 'transparent',
                padding: '7px 0', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '7px', font: 'inherit',
                color: 'var(--dsw-alias-label-primary)' },
              onClick: () => navigate('detail', { nodeId: item.id, runId: item.id }) },
              icon(item.status === 'succeeded' ? 'check' : item.status === 'failed' ? 'x' : 'method',
                item.status === 'failed' ? '#d73535' : '#179660', 16),
              h('span', { style: { minWidth: 0, flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.name),
              statusPill(t, item.status))))),
          node.type === 'run' && run && h(React.Fragment, null,
            run.errorMessage && h('p', { role: 'alert' }, run.errorMessage),
            card(t('command'), h('div', { style: { overflowWrap: 'anywhere' } }, run.command ?? '—')),
            card(t('metrics'), facts(t('metrics'), run.metrics ?? t('metricsMissing'))),
            card(t('config'), foldedFacts(t('config'), run.config)),
            card(t('git'), foldedFacts(t('git'), run.git)),
            card(t('dataset'), foldedFacts(t('dataset'), run.dataset)),
            card(t('assets'), foldedFacts(t('assets'), run.assets))),
          relatedClaims.length > 0 && card(`${t('relatedClaims')} (${relatedClaims.length})`,
            h('div', null, ...relatedClaims.map((claim) => h('button', { key: claim.id,
              type: 'button', style: { display: 'block', width: '100%', padding: '7px 0',
                border: 'none', borderTop: '1px solid var(--dsw-alias-border-l3)',
                textAlign: 'left', background: 'transparent', cursor: 'pointer',
                color: 'var(--dsw-alias-label-primary)', font: 'inherit' },
              onClick: () => navigate('detail', { documentId: claim.documentId, claimId: claim.id }) },
              claim.originalText)))),
          decisions?.length > 0 && card(t('decisions'), foldedFacts(t('decisions'), decisions)),
          latestDecision?.reopenCondition && card(t('nextStep'),
            h('p', { style: { margin: 0 } }, latestDecision.reopenCondition)),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' } },
            node.type === 'method' && !node.isPrimary &&
              tree.nodes.find((item) => item.id === node.id)?.defaultVisible &&
              h('button', { type: 'button', style: buttonStyle,
                onClick: () => treeAction('primary', { nodeId: node.id }) }, t('primary')),
            node.type !== 'run' && h('button', { type: 'button', style: buttonStyle,
              onClick: () => treeAction(node.status === 'archived' ? 'restore' : 'archive',
                { nodeId: node.id }) }, t(node.status === 'archived' ? 'restore' : 'archive')),
            h('button', { type: 'button', style: buttonStyle,
              onClick: () => askChat(node.type === 'run' ? 'run' : 'node', node.id,
                node.name) }, t('askChat'))));
      }

      function renderDocumentDetail() {
        if (!selectedDocumentId) return null;
        const document = documents.find((item) => item.id === selectedDocumentId);
        return h('section', { 'aria-label': t('claims') },
          h('div', { style: { display: 'flex', gap: '9px', alignItems: 'center',
            marginTop: '15px' } }, icon('document', '#172033', 24),
            h('h3', { style: { margin: 0, fontSize: '18px', overflowWrap: 'anywhere' } },
              document?.path.split('/').at(-1) ?? t('papers'))),
          card(t('claims'), h('div', null,
            claimsState === 'loading' && h('p', null, t('loading')),
            claimsState === 'error' && h('p', { role: 'alert' }, t('documentError')),
            claimsState === 'ready' && (claims.length ? claims.map((claim) => h('div', { key: claim.id,
              style: { borderTop: '1px solid var(--dsw-alias-border-l3)', padding: '6px 0' } },
              h('button', { type: 'button', style: { width: '100%', border: 'none',
                background: 'transparent', textAlign: 'left', cursor: 'pointer',
                color: 'var(--dsw-alias-label-primary)', font: 'inherit' },
                onClick: () => setSelectedClaimId(claim.id) }, `${claim.type} · ${claim.status}`),
              selectedClaimId === claim.id && h('div', { style: { padding: '5px 0 6px' } },
                h('p', null, claim.originalText), facts(t('source'), claim.sourceLocation),
                foldedFacts(t('summary'), claim.normalized),
                h('button', { type: 'button', style: buttonStyle,
                  onClick: () => askChat('claim', claim.id, claim.originalText) }, t('askChat')))))
              : h('p', { style: secondaryStyle }, t('noClaims'))))),
          selectedClaimId && card(t('trace'), h('div', null,
            h('button', { type: 'button', style: buttonStyle,
              onClick: () => traceAction('trace', {}) }, t('trace')),
            traceState.kind === 'loading' && h('p', null, t('traceLoading')),
            traceState.kind === 'error' && h('p', { role: 'alert' }, traceState.message),
            traceState.kind === 'ready' && h('div', null,
              h('p', null, traceState.value.claim.status),
              ...(traceState.value.candidates ?? []).map((candidate) => h('div', { key: candidate.runId },
                h('button', { type: 'button', style: buttonStyle,
                  onClick: () => navigate('detail', { runId: candidate.runId, nodeId: candidate.runId }) },
                  `${candidate.name} · ${candidate.score.toFixed(1)}`),
                h('p', { style: secondaryStyle }, candidate.reasons.join('; ')),
                candidate.contradictions.length > 0 && h('p', { role: 'alert' },
                  candidate.contradictions.join('; ')),
                traceState.value.claim.status === 'ambiguous' && h('button', { type: 'button',
                  style: buttonStyle, onClick: () => traceAction('confirm', { runId: candidate.runId }) },
                  t('confirm')))),
              traceState.value.evidenceChain
                ? facts(t('evidence'), traceState.value.evidenceChain)
                : h('p', { style: secondaryStyle }, t('noTrace'))))));
      }
      let content;
      if (state.kind === 'no-workspace') content = h('p', { style: secondaryStyle }, t('noWorkspace'));
      else if (state.kind === 'loading') content = h('p', { style: secondaryStyle }, t('loading'));
      else if (state.kind === 'initializing') content = h('p', { style: secondaryStyle }, t('initializing'));
      else if (state.kind === 'error') content = h('p', { role: 'alert' }, `${t('error')} ${state.message}`);
      else if (!state.value.initialized) content = h(React.Fragment, null,
        h('p', { style: secondaryStyle }, t('empty')),
        h('button', { type: 'button', style: buttonStyle, onClick: initialize }, t('initialize')));
      if (content) return h('section', { style: { ...panelStyle, display: 'block',
        padding: '18px', overflowY: 'auto' }, 'aria-label': t('title') },
        h('h2', { style: { fontSize: '18px', fontWeight: 750, margin: '0 0 12px' } }, t('title')),
        content);

      const showRight = view !== 'tree';
      const split = treeOpen && showRight;
      const closeTree = () => {
        if (showRight) setTreeOpen(false);
        else tab.actions.close();
      };
      const closeRight = () => {
        if (treeOpen) setView('tree');
        else tab.actions.close();
      };
      const header = (title, closeLabel, close) => h('header', { style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', marginBottom: '10px' } },
        h('h2', { style: { fontSize: '17px', fontWeight: 750, margin: 0,
          minWidth: 0, overflowWrap: 'anywhere' } }, title),
        h('button', { type: 'button', onClick: close, 'aria-label': closeLabel,
          title: closeLabel, style: { ...buttonStyle, border: 'none', padding: '4px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flex: 'none', color: 'var(--dsw-alias-label-secondary)' } },
        icon('x', 'currentColor', 17)));
      return h('div', { style: panelStyle, 'aria-label': t('title') },
        treeOpen && h('section', { style: { ...paneStyle,
          flexBasis: split ? '50%' : '100%',
          borderRight: split ? '1px solid var(--dsw-alias-border-l3)' : 'none' },
        'aria-label': `${t('title')} · ${t('tree')}` },
        header(t('title'), t('closeTree'), closeTree),
        renderTreePage()),
        showRight && h('section', { key: `${view}:${selectedNodeId ?? ''}:${selectedDocumentId ?? ''}:${selectedClaimId ?? ''}`,
          style: { ...paneStyle,
          flexBasis: split ? '50%' : '100%' },
        'aria-label': `${t('title')} · ${view === 'audit' ? t('auditPaper') : t('detail')}` },
        header(view === 'audit' ? t('auditPaper') : t('detail'),
          t(view === 'audit' ? 'closeAudit' : 'closeDetail'), closeRight),
        h('button', { type: 'button', style: { ...buttonStyle,
          padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
          onClick: () => navigate('tree') }, icon('arrow', 'currentColor', 14), t('backTree')),
        view === 'detail' && h('section', { 'aria-label': t('detail') },
          !selectedNodeId && !selectedDocumentId && h('p', { style: secondaryStyle }, t('noSelection')),
          selectedNodeId && renderNodeDetail(),
          !selectedNodeId && selectedDocumentId && renderDocumentDetail()),
        view === 'audit' && renderAudit()));
    }

    return {
      inject: ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale'],
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
          inject: () => ({ loadProject: callProject, loadRuns, callTree, callDecision, callPaper, callTrace, callAudit }),
        }, ResearchTraceBody)), 'researchtrace: sidebar body');
        const toolNames = ['researchtrace_run_experiment', 'researchtrace_create_node',
          'researchtrace_get_node_detail', 'researchtrace_parse_document',
          'researchtrace_trace_claim', 'researchtrace_run_audit',
          'researchtrace_get_audit_report'];
        for (const toolName of toolNames) {
          ctx.effect(() => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
            name: 'tool.call.toolview', key: toolName, locale: NS,
            inject: () => ({ sidebarRight: ctx.sidebarRight }),
          }, ResearchTraceToolCard)), `researchtrace: ${toolName} chat card`);
        }
      },
    };
  },
});
