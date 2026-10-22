import { withinWorkspace } from '../experiment/config.js';
import { createRun, finishRun, markRunRunning } from '../experiment/run-repository.js';
import { workspaceRoot } from './project-tools.js';

async function waitForBashJob(ctx, jobId, exec) {
  const jobs = ctx.get?.('jobs');
  if (!jobs) throw new Error('Harness job registry is unavailable for a long-running experiment');
  const owner = exec.agent?.id;
  let view;
  try {
    do {
      view = await jobs.wait(jobId, 60_000, owner, exec.signal);
    } while (view.status === 'running' || view.status === 'stopping');
  } catch (error) {
    jobs.kill(jobId, owner, 'ResearchTrace experiment cancelled');
    await jobs.wait(jobId, 60_000, owner);
    throw error;
  }
  const chunks = jobs.readAt(jobId, 0, owner).chunks;
  const stdout = chunks.filter((chunk) => chunk.channel !== 'stderr').map((chunk) => chunk.text).join('');
  const stderr = chunks.filter((chunk) => chunk.channel === 'stderr').map((chunk) => chunk.text).join('');
  const exitCode = view.status === 'completed' ? 0 : Number(view.detail?.match(/exit code:\s*(\d+)/)?.[1] ?? 1);
  jobs.remove(jobId, owner);
  return { exitCode, stdout, stderr, cancelled: view.status === 'killed' };
}

async function invokeHarnessBash(ctx, exec, input, root) {
  const workdir = input.workdir ? withinWorkspace(root, input.workdir) : root;
  const result = await ctx.tools.execute({
    callId: `${exec.callId}:researchtrace-bash`,
    rootCallId: exec.rootCallId,
    parent: exec.token,
    name: 'bash',
    arguments: {
      description: `Run ResearchTrace experiment ${input.runName || input.methodName || 'training'}`,
      command: input.command,
      workdir,
      ...(input.timeoutMs ? { timeoutMs: input.timeoutMs } : {}),
    },
    agent: exec.agent,
    signal: exec.signal,
  });
  if (result.isError) throw new Error(result.error.message);
  const value = result.value;
  if (value.kind === 'foreground') {
    return { exitCode: value.exitCode, stdout: value.stdout?.text ?? '',
      stderr: value.stderr?.text ?? '', cancelled: value.aborted || Boolean(exec.signal.aborted) };
  }
  if ((value.kind === 'promoted' || value.kind === 'background') && value.jobId) {
    return waitForBashJob(ctx, value.jobId, exec);
  }
  throw new Error(`Unsupported Harness bash outcome: ${value.kind}`);
}

export async function executeExperiment(ctx, root, input, exec) {
  const created = createRun(root, input);
  markRunRunning(root, created.id);
  let outcome;
  try {
    outcome = await invokeHarnessBash(ctx, exec, input, root);
  } catch (error) {
    outcome = { exitCode: null, stdout: '', stderr: '',
      cancelled: Boolean(exec.signal?.aborted), errorMessage: String(error) };
  }
  const completed = await finishRun(root, created.id, {
    ...outcome, metricsPath: input.metricsPath, assetPaths: input.assetPaths,
  });
  return completed;
}

export function registerExperimentTool(ctx) {
  return ctx.tools.register({
    name: 'researchtrace_run_experiment',
    description: `Use when the user asks Harness to run a research experiment and wants it recorded.
      Create the run before execution, capture Git/config, execute through Harness's guarded bash tool,
      then retain successful, failed, or cancelled results. Do not call for ordinary commands or when
      the user explicitly asks not to record the experiment.`,
    parameters: {
      type: 'object', additionalProperties: false,
      required: ['intent', 'methodName', 'command'],
      properties: {
        intent: { type: 'string', description: 'Original user request, kept as experiment provenance.' },
        methodName: { type: 'string', description: 'Research method or route name.' },
        groupName: { type: 'string', description: 'Experiment group name; defaults to Experiments.' },
        methodId: { type: 'string', description: 'Existing method node id when disambiguation is needed.' },
        groupId: { type: 'string', description: 'Existing experiment group node id; takes precedence over methodName/groupName.' },
        runName: { type: 'string', description: 'Readable name for this single run.' },
        command: { type: 'string', description: 'Training command to execute via Harness bash permissions.' },
        workdir: { type: 'string', description: 'Working directory within the current Harness workspace.' },
        configPath: { type: 'string', description: 'YAML or JSON config, relative to the workspace.' },
        configValues: { type: 'object', description: 'Key parameters stated by the user when there is no config file.',
          additionalProperties: { type: ['string', 'number', 'boolean'] } },
        metricsPath: { type: 'string', description: 'Expected JSON or CSV metrics file, relative to the workspace.' },
        assetPaths: { type: 'array', items: { type: 'string' }, description: 'Additional local output file paths.' },
        seed: { type: 'integer', description: 'Seed, if explicitly known.' },
        timeoutMs: { type: 'integer', description: 'Harness bash foreground timeout in milliseconds.' },
      },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(input, exec) {
      const root = await workspaceRoot(exec, ctx.workspaceRegistry);
      const result = await executeExperiment(ctx, root, input, exec);
      return JSON.stringify(result);
    },
  });
}
