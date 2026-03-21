import type { Agent, Activity, Channel, DashboardData, GitHubSummary } from './types';

let _apiBase: string | null = null;

export function setApiBase(base: string) {
  _apiBase = base;
}

function getBase(): string {
  if (_apiBase) return _apiBase;
  const envBase = import.meta.env.VITE_API_BASE || '';
  return `${envBase}/api`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${getBase()}${path}`);
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

export interface ThresholdData {
  isNightMode: boolean;
  normal: { onlineMinutes: number; busyMinutes: number; awayMinutes: number };
  night: { onlineMinutes: number; busyMinutes: number; awayMinutes: number };
  current: { onlineMinutes: number; busyMinutes: number; awayMinutes: number };
  heartbeatFailuresForError: number;
}

export const fetchThresholds = () => get<ThresholdData>('/config/thresholds');

export interface HealthData {
  status: string;
  dataSource: string;
  agentsCount: number;
  channelsCount: number;
  lastPollMs: number;
  uptime: number;
}

export const fetchHealth = () => get<HealthData>('/health');
