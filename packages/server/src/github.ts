import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitHubIssue, GitHubSummary } from './types.js';

const execFileAsync = promisify(execFile);

const DEFAULT_REPO = process.env.GITHUB_REPO || 'WingedDragonOrg/claw-visual';

let cachedSummary: GitHubSummary | null = null;
let lastFetch = 0;
const CACHE_MS = 60_000; // 1 minute cache

async function fetchIssues(): Promise<GitHubSummary> {
  try {
    const { stdout } = await execFileAsync('gh', [
      'issue', 'list',
      '--repo', DEFAULT_REPO,
      '--state', 'open',
      '--json', 'number,title,assignees,labels,state',
      '--limit', '50'
    ], { encoding: 'utf-8', timeout: 10_000 });
    const issues: GitHubIssue[] = JSON.parse(stdout);
    const byAssignee: Record<string, number> = {};

    for (const issue of issues) {
      for (const assignee of issue.assignees) {
        byAssignee[assignee.login] = (byAssignee[assignee.login] || 0) + 1;
      }
    }

    return { open: issues.length, byAssignee, issues };
  } catch (e) {
    console.error('[claw-visual] GitHub fetch error:', e);
    return { open: 0, byAssignee: {}, issues: [] };
  }
}

export async function fetchGitHubIssues(): Promise<GitHubSummary> {
  const now = Date.now();
  if (cachedSummary && now - lastFetch < CACHE_MS) {
    return cachedSummary;
  }
  cachedSummary = await fetchIssues();
  lastFetch = now;
  return cachedSummary;
}

export function getIssueCountForAgent(assigneeMap: Record<string, number>, agentId: string): number {
  if (assigneeMap[agentId]) return assigneeMap[agentId];
  return 0;
}
