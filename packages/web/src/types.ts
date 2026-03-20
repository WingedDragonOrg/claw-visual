export type AgentStatus = 'online' | 'away' | 'busy' | 'error' | 'offline';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  lastSeen: string;
  avatar: string;
  pendingTasks: number;
  heartbeatFailures: number;
}

export interface Activity {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface DashboardData {
  totalAgents: number;
  online: number;
  away: number;
  busy: number;
  error: number;
  offline: number;
  recentActivities: Activity[];
  lastUpdated: string;
}
