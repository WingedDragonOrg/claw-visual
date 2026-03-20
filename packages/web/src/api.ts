import type { Agent, Activity, DashboardData, GitHubSummary } from './types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const fetchAgents = () => get<Agent[]>('/agents');
export const fetchActivity = (id: string) => get<Activity[]>(`/agents/${encodeURIComponent(id)}/activity`);
export const fetchDashboard = () => get<DashboardData>('/dashboard');
export const fetchIssues = () => get<GitHubSummary>('/issues');
