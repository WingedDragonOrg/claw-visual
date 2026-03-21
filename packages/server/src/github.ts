import { execFileSync } from 'node:child_process';
import type { GitHubIssue, GitHubSummary } from './types.js';

const DEFAULT_REPO = process.env.GITHUB_REPO || 'WingedDragonOrg/remote-shell';

let cachedSummary: GitHubSummary | null = null;
let lastFetch = 0;
const CACHE_MS = 60_000; // 1 minute cache

function fetchIssues(): GitHubSummary {
  try {
    const output = execFileSync('gh', [
      'issue', 'list',
      '--repo', DEFAULT_REPO,
      '--state', 'open',
      '--json', 'number,title,assignees,labels,state',
      '--limit', '50'
    ], { encoding: 'utf-8', timeout: 10_000 });
    const issues: GitHubIssue[] = JSON.parse(output);
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
  cachedSummary = fetchIssues();
  lastFetch = now;
  return cachedSummary;
}

export function getIssueCountForAgent(assigneeMap: Record<string, number>, agentId: string): number {
  // Try exact match first
  if (assigneeMap[agentId]) return assigneeMap[agentId];
  // Try common mappings (e.g., "WingedDragon" → all agents since it's the owner)
  return 0;
}
