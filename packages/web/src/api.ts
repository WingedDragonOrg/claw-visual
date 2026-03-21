import type { Agent, Activity, Channel, DashboardData, GitHubSummary } from './types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

export const fetchAgents = () => get<Agent[]>('/agents');
export const fetchActivity = (id: string) => get<Activity[]>(`/agents/${encodeURIComponent(id)}/activity`);
export const fetchDashboard = () => get<DashboardData>('/dashboard');
export const fetchIssues = () => get<GitHubSummary>('/issues');
export const fetchChannels = () => get<Channel[]>('/channels');
export const fetchChannelAgents = (channelId: string) =>
  get<Agent[]>(`/channels/${encodeURIComponent(channelId)}/agents`);
