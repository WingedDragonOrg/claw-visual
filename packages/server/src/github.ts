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
    const [openResult, closedResult] = await Promise.all([
      execFileAsync('gh', [
        'issue', 'list',
        '--repo', DEFAULT_REPO,
        '--state', 'open',
        '--json', 'number,title,assignees,labels,state',
        '--limit', '50'
      ], { encoding: 'utf-8', timeout: 10_000 }),
      execFileAsync('gh', [
        'issue', 'list',
        '--repo', DEFAULT_REPO,
        '--state', 'closed',
        '--json', 'number,title,assignees,labels,state,createdAt,closedAt',
        '--limit', '50'
      ], { encoding: 'utf-8', timeout: 10_000 }),
    ]);

    const openIssues: GitHubIssue[] = JSON.parse(openResult.stdout);
    const closedIssues: GitHubIssue[] = JSON.parse(closedResult.stdout);
    const byAssignee: Record<string, number> = {};

    for (const issue of openIssues) {
      for (const assignee of issue.assignees) {
        byAssignee[assignee.login] = (byAssignee[assignee.login] || 0) + 1;
      }
    }

    let avgCloseTimeHours = 0;
    if (closedIssues.length > 0) {
      let totalMs = 0;
      let count = 0;
      for (const issue of closedIssues) {
        if (issue.createdAt && issue.closedAt) {
          totalMs += new Date(issue.closedAt).getTime() - new Date(issue.createdAt).getTime();
          count++;
        }
      }
      if (count > 0) {
        avgCloseTimeHours = Math.round((totalMs / count / 3_600_000) * 10) / 10;
      }
    }

    return {
      open: openIssues.length,
      closed: closedIssues.length,
      avgCloseTimeHours,
      byAssignee,
      issues: openIssues,
    };
  } catch (e) {
    console.error('[claw-visual] GitHub fetch error:', e);
    return { open: 0, closed: 0, avgCloseTimeHours: 0, byAssignee: {}, issues: [] };
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
