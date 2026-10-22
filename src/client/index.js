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

      const auditFindings = auditState.kind === 'ready' ? auditState.value.findings : [];
      const findingsForNode = (node) => {
        const ids = new Set();
        const visit = (item) => { ids.add(item.id); item.children.forEach(visit); };
        visit(node);
        return auditFindings.filter((item) => item.runId && ids.has(item.runId)).length;
      };

      function renderAudit() {
        const report = auditState.kind === 'ready' ? auditState.value : null;
        const selected = report?.findings.find((item) => item.id === selectedFindingId);
        return h('section', { 'aria-label': t('audit'),
          style: { borderTop: '1px solid var(--dsw-alias-border-l3)', marginTop: '16px', paddingTop: '10px' } },
          h('h3', { style: { fontSize: '13px' } }, t('audit')),
          h('button', { type: 'button', style: buttonStyle,
            onClick: () => auditAction('run', {}) }, t('runAudit')),
          auditState.kind === 'loading' && h('p', null, t('loading')),
          auditState.kind === 'error' && h('p', { role: 'alert' }, auditState.message),
          auditSessions.length ? h('ul', { style: { listStyle: 'none', padding: 0 } },
            ...auditSessions.slice(0, 10).map((session) => h('li', { key: session.id },
              h('button', { type: 'button', style: { ...buttonStyle, width: '100%',
                textAlign: 'left', marginTop: '5px' },
              onClick: () => auditAction('report', { sessionId: session.id }) },
              `${session.createdAt} · E${session.counts.error} W${session.counts.warning} I${session.counts.info}`))))
            : h('p', { style: secondaryStyle }, t('noAudit')),
          report && h(React.Fragment, null,
            h('p', null, `E${report.counts.error} · W${report.counts.warning} · I${report.counts.info}`),
            h('h4', null, t('ruleGroups')),
            h('p', { style: secondaryStyle }, Object.entries(report.findings.reduce((groups, item) => {
              groups[item.ruleId] = (groups[item.ruleId] ?? 0) + 1;
              return groups;
            }, {})).map(([rule, count]) => `${rule} ×${count}`).join(' · ') || '0'),
            h('h4', null, t('findings')),
            report.findings.length ? h('ul', { style: { listStyle: 'none', padding: 0 } },
              ...report.findings.map((item) => h('li', { key: item.id },
                h('button', { type: 'button', style: { ...buttonStyle, width: '100%',
                  textAlign: 'left', marginTop: '5px' },
                onClick: () => setSelectedFindingId(item.id) },
                `${item.severity.toUpperCase()} · ${item.ruleId}: ${item.message}`))))
              : h('p', { style: secondaryStyle }, '0'),
            selected && h('div', { 'aria-label': selected.ruleId },
              h('strong', null, `${selected.severity.toUpperCase()} · ${selected.ruleId}`),
              h('p', null, selected.message),
              h('p', { style: secondaryStyle },
                `Claim ${selected.claimId ?? '—'} → Run ${selected.runId ?? '—'}`),
              facts(t('source'), selected.paperEvidence),
              facts(t('evidence'), selected.experimentEvidence),
              h('p', null, selected.recommendation),
              selected.claimId && h('button', { type: 'button', style: buttonStyle,
                onClick: () => navigate('detail', { claimId: selected.claimId,
                  documentId: report.documentId }) }, t('openClaim')),
              selected.runId && h('button', { type: 'button', style: buttonStyle,
                onClick: () => navigate('detail', { runId: selected.runId, nodeId: selected.runId }) },
              t('openRun')),
              h('button', { type: 'button', style: buttonStyle,
                onClick: () => askChat('finding', selected.id,
                  `${selected.ruleId}: ${selected.message}`) }, t('askChat')))));
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
        const hasChildren = node.children.length > 0;
        const open = expanded[node.id] ?? (node.type !== 'experiment_group');
        const symbol = node.status === 'archived' ? '▣' : node.status === 'rejected' ? '✕'
          : node.status === 'paused' ? '⏸' : node.isPrimary ? '★' : '•';
        const issueCount = findingsForNode(node);
        return h('li', { key: node.id, style: { listStyle: 'none', margin: '3px 0 3px 8px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '3px', opacity: node.defaultVisible ? 1 : 0.6 } },
            hasChildren ? h('button', { type: 'button', style: { ...buttonStyle, padding: '1px 5px' },
              'aria-label': `${open ? 'Collapse' : 'Expand'} ${node.name}`,
              onClick: () => setExpanded((value) => ({ ...value, [node.id]: !open })) }, open ? '▾' : '▸')
              : h('span', { style: { width: '20px' } }, ''),
            h('button', { type: 'button', style: { ...buttonStyle, border: 'none', padding: '3px',
              textAlign: 'left', background: selectedNodeId === node.id ? 'var(--dsw-alias-bg-layer-2)' : 'transparent' },
              onClick: () => navigate('detail', { nodeId: node.id,
                runId: node.type === 'run' ? node.id : undefined }) },
            `${symbol} ${node.name}${node.type === 'run' ? ` · ${runs.find((run) => run.id === node.id)?.status ?? 'run'}` : ''}${issueCount ? ` · ⚠ ${issueCount}` : ''}`)),
          hasChildren && open && h('ul', { style: { margin: 0, paddingLeft: `${depth ? 8 : 2}px` } },
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
      let content;
      if (state.kind === 'no-workspace') content = h('p', { style: secondaryStyle }, t('noWorkspace'));
      else if (state.kind === 'loading') content = h('p', { style: secondaryStyle }, t('loading'));
      else if (state.kind === 'initializing') content = h('p', { style: secondaryStyle }, t('initializing'));
      else if (state.kind === 'error') content = h('p', { role: 'alert' }, `${t('error')} ${state.message}`);
      else if (!state.value.initialized) content = h(React.Fragment, null,
        h('p', { style: secondaryStyle }, t('empty')),
        h('button', { type: 'button', style: buttonStyle, onClick: initialize }, t('initialize')));
      else content = h(React.Fragment, null,
        h('p', { style: { ...secondaryStyle, margin: '0 0 10px' } },
          `${state.value.project.name} · ${t('ready')}`),
        h('nav', { 'aria-label': 'ResearchTrace views', style: { display: 'flex', gap: '5px', marginBottom: '12px' } },
          ...[['tree', 'treeView'], ['detail', 'detailView'], ['audit', 'auditView']].map(([key, label]) =>
            h('button', { key, type: 'button', style: { ...buttonStyle, flex: 1,
              background: view === key ? 'var(--dsw-alias-bg-layer-2)' : buttonStyle.background },
              'aria-current': view === key ? 'page' : undefined,
              onClick: () => setView(key) }, t(label)))),
        view === 'tree' && h('section', { 'aria-label': t('tree') },
          treeState === 'loading' && h('p', null, t('loading')),
          treeError && h('p', { role: 'alert' }, treeError),
          tree.roots.length ? h('ul', { style: { margin: 0, padding: 0 } },
            ...tree.roots.map((node) => renderNode(node))) :
            treeState === 'ready' && h('p', { style: secondaryStyle }, t('noNodes')),
          h('h3', { style: { margin: '16px 0 6px', fontSize: '13px' } }, t('runs')),
          runsState === 'loading' && h('p', null, t('loading')),
          runsState === 'error' && h('p', { role: 'alert' }, t('runError')),
          runsState === 'ready' && (runs.length ? h('ul', { style: { listStyle: 'none', padding: 0 } },
            ...runs.slice(0, 8).map((run) => h('li', { key: run.id, style: { marginBottom: '5px' } },
              h('button', { type: 'button', style: { ...buttonStyle, width: '100%', textAlign: 'left' },
                onClick: () => navigate('detail', { runId: run.id, nodeId: run.id }) },
              `${run.name} · ${run.status}${run.metricsStatus === 'missing' ? ` · ${t('metricsMissing')}` : ''}`))))
            : h('p', { style: secondaryStyle }, t('noRuns')))),
        view === 'detail' && h('section', { 'aria-label': t('detail') },
          !selectedNodeId && !selectedRunId && !selectedDocumentId &&
            h('p', { style: secondaryStyle }, t('noSelection')),
          treeError && h('p', { role: 'alert' }, treeError),
          selectedNodeId && nodeDetailState === 'loading' && h('p', null, t('loading')),
          nodeDetailState === 'ready' && nodeDetail && h('section', { 'aria-label': nodeDetail.node.name },
            h('strong', null, `${nodeDetail.node.name} · ${nodeDetail.node.type === 'run'
              ? nodeDetail.run?.status ?? nodeDetail.node.status : nodeDetail.node.status}${nodeDetail.node.isPrimary ? ' ★' : ''}`),
            h('p', { style: secondaryStyle }, nodeDetail.lineage.map((part) => part.name).join(' / ')),
            nodeDetail.node.motivation && facts(t('motivation'), nodeDetail.node.motivation),
            nodeDetail.node.summary && facts(t('summary'), nodeDetail.node.summary),
            nodeDetail.node.type === 'experiment_group' && nodeDetail.node.tags?.length > 0 &&
              facts(t('variables'), nodeDetail.node.tags),
            nodeDetail.children?.length > 0 && h('p', { style: secondaryStyle },
              `${t('children')}: ${nodeDetail.children.map((part) => `${part.name} (${part.status})`).join(' · ')}`),
            nodeDetail.decisions?.length > 0 && foldedFacts(t('decisions'), nodeDetail.decisions),
            nodeDetail.decisions?.[0]?.reopenCondition &&
              facts(t('nextStep'), nodeDetail.decisions[0].reopenCondition),
            nodeDetail.runs?.length > 0 && h('div', null,
              h('h4', null, t('childRuns')),
              ...nodeDetail.runs.map((run) => h('button', { key: run.id, type: 'button',
                style: { ...buttonStyle, display: 'block', width: '100%', textAlign: 'left', marginTop: '4px' },
                onClick: () => navigate('detail', { nodeId: run.id, runId: run.id }) },
              `${run.name} · ${run.status}`))),
            nodeDetail.node.type === 'method' && !nodeDetail.node.isPrimary &&
              tree.nodes.find((node) => node.id === nodeDetail.node.id)?.defaultVisible &&
              h('button', { type: 'button', style: buttonStyle,
                onClick: () => treeAction('primary', { nodeId: nodeDetail.node.id }) }, t('primary')),
            nodeDetail.node.type !== 'run' && h('button', { type: 'button', style: buttonStyle,
                onClick: () => treeAction(nodeDetail.node.status === 'archived' ? 'restore' : 'archive',
                { nodeId: nodeDetail.node.id }) },
            t(nodeDetail.node.status === 'archived' ? 'restore' : 'archive')),
            h('button', { type: 'button', style: buttonStyle,
              onClick: () => askChat('node', nodeDetail.node.id, nodeDetail.node.name) }, t('askChat'))),
          selectedRunId && runDetailState === 'loading' && h('p', null, t('runLoading')),
          selectedRunId && runDetailState === 'error' && h('p', { role: 'alert' }, t('runError')),
          runDetailState === 'ready' && runDetail && h('section', { 'aria-label': runDetail.name,
            style: { borderTop: '1px solid var(--dsw-alias-border-l3)', marginTop: '12px' } },
            h('h3', null, `${runDetail.name} · ${runDetail.status}`),
            runDetail.errorMessage && h('p', { role: 'alert' }, runDetail.errorMessage),
            facts(t('command'), runDetail.command),
            facts(t('metrics'), runDetail.metrics ?? t('metricsMissing')),
            foldedFacts(t('config'), runDetail.config), foldedFacts(t('git'), runDetail.git),
            foldedFacts(t('dataset'), runDetail.dataset), foldedFacts(t('assets'), runDetail.assets),
            h('button', { type: 'button', style: buttonStyle,
              onClick: () => askChat('run', runDetail.id,
                `${runDetail.name}, ${runDetail.status}`) }, t('askChat'))),
          h('h3', { style: { margin: '16px 0 6px', fontSize: '13px' } }, t('papers')),
          documentsState === 'loading' && h('p', null, t('loading')),
          documentsState === 'error' && h('p', { role: 'alert' }, t('documentError')),
          documentsState === 'ready' && (documents.length ? h('ul', { style: { listStyle: 'none', padding: 0 } },
            ...documents.map((document) => h('li', { key: document.id, style: { marginBottom: '5px' } },
              h('button', { type: 'button', style: { ...buttonStyle, width: '100%', textAlign: 'left' },
                onClick: () => navigate('detail', { documentId: document.id }) },
              `${document.path.split('/').at(-1)} · ${document.claimCount} ${t('claims')}`))))
            : h('p', { style: secondaryStyle }, t('noPapers'))),
          selectedDocumentId && h('section', { 'aria-label': t('claims') },
            h('h4', null, t('claims')),
            claimsState === 'loading' && h('p', null, t('loading')),
            claimsState === 'error' && h('p', { role: 'alert' }, t('documentError')),
            claimsState === 'ready' && (claims.length ? h('ul', { style: { listStyle: 'none', padding: 0 } },
              ...claims.map((claim) => h('li', { key: claim.id,
                style: { borderTop: '1px solid var(--dsw-alias-border-l3)', padding: '6px 0' } },
                h('button', { type: 'button', style: { ...buttonStyle, width: '100%', textAlign: 'left' },
                  onClick: () => setSelectedClaimId(claim.id) }, `${claim.type} · ${claim.status}`),
                selectedClaimId === claim.id && h(React.Fragment, null,
                  h('p', null, claim.originalText), facts(t('source'), claim.sourceLocation),
                  foldedFacts(t('summary'), claim.normalized),
                  h('button', { type: 'button', style: buttonStyle,
                    onClick: () => askChat('claim', claim.id, claim.originalText) }, t('askChat'))))))
              : h('p', { style: secondaryStyle }, t('noClaims'))),
            selectedClaimId && h('section', { 'aria-label': t('trace') },
              h('h4', null, t('trace')),
              h('button', { type: 'button', style: buttonStyle,
                onClick: () => traceAction('trace', {}) }, t('trace')),
              traceState.kind === 'loading' && h('p', null, t('traceLoading')),
              traceState.kind === 'error' && h('p', { role: 'alert' }, traceState.message),
              traceState.kind === 'ready' && h(React.Fragment, null,
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
                  : h('p', { style: secondaryStyle }, t('noTrace')))))),
        view === 'audit' && h(React.Fragment, null,
          documentsState === 'error' && h('p', { role: 'alert' }, t('documentError')),
          documents.length ? h('select', { 'aria-label': t('papers'), value: selectedDocumentId ?? '',
            onChange: (event) => selectDocument(event.target.value) },
            h('option', { value: '' }, t('papers')),
            ...documents.map((document) => h('option', { key: document.id, value: document.id },
              document.path.split('/').at(-1)))) : h('p', { style: secondaryStyle }, t('noPapers')),
          selectedDocumentId && renderAudit()));
      return h('section', { style: panelStyle, 'aria-label': t('title') },
        h('h2', { style: { fontSize: '15px', margin: '0 0 12px' } }, t('title')),
        content);
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
