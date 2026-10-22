import { execFileSync } from 'node:child_process';
import { sha256 } from './config.js';

function git(root, args, maxBuffer = 32 * 1024 * 1024) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', timeout: 10_000, maxBuffer, stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function optionalGit(root, args) {
  try { return git(root, args); } catch { return null; }
}

export function captureGit(root) {
  const gitRoot = optionalGit(root, ['rev-parse', '--show-toplevel'])?.trim();
  if (!gitRoot) {
    return { available: false, commit: null, branch: null, dirty: null,
      diffHash: null, untrackedFiles: [], snapshotAvailable: false };
  }
  const status = (optionalGit(root, ['status', '--porcelain=v1', '--untracked-files=all']) ?? '')
    .split('\n').filter((line) => line && !/^\?\? \.researchtrace\//.test(line));
  const untrackedFiles = (optionalGit(root, ['ls-files', '--others', '--exclude-standard']) ?? '')
    .split('\n').filter((line) => line && !line.startsWith('.researchtrace/'));
  let diffHash = null;
  try {
    const diff = git(root, ['diff', 'HEAD', '--binary']);
    if (diff) diffHash = sha256(diff);
  } catch { /* No HEAD or an oversized diff; the status remains observable. */ }
  return {
    available: true,
    commit: optionalGit(root, ['rev-parse', 'HEAD'])?.trim() ?? null,
    branch: optionalGit(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'])?.trim() ?? null,
    dirty: status.length > 0,
    diffHash,
    untrackedFiles,
    snapshotAvailable: false,
  };
}
