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
  lastActivity?: string | null;
  issueCount?: number;
}

export interface Activity {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  assignees: { login: string }[];
  labels: { name: string }[];
}

export interface GitHubSummary {
  open: number;
  byAssignee: Record<string, number>;
  issues: GitHubIssue[];
}

export interface Channel {
  id: string;
  name: string;
  type: 'discord' | 'telegram' | 'signal' | 'other';
  agentIds: string[];
  agentCount: number;
  onlineCount: number;
  lastActivity: string | null;
}

export interface DashboardData {
  totalAgents: number;
  online: number;
  away: number;
  busy: number;
  error: number;
  offline: number;
  openIssues: number;
  recentActivities: Activity[];
  lastUpdated: string;
}
