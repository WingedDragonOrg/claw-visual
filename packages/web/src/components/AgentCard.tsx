import type { Agent, AgentStatus } from '../types';

const STATUS_LABELS: Record<AgentStatus, string> = {
  online: '在线',
  away: '离开',
  busy: '忙碌中',
  error: '异常',
  offline: '离线',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className={`agent-card status-${agent.status}`}>
      <div className="agent-card-header">
        <div className={`agent-avatar ${agent.status}`}>{agent.avatar}</div>
        <div className="agent-info">
          <h3>{agent.name}</h3>
          {agent.role && <span className="role">{agent.role}</span>}
        </div>
      </div>
      {agent.lastActivity && (
        <div className="agent-card-activity">
          <span className="activity-preview">{agent.lastActivity}</span>
        </div>
      )}
      <div className="agent-card-body">
        <span className={`status-badge ${agent.status}`}>
          <span className="dot" />
          {STATUS_LABELS[agent.status]}
        </span>
        <div className="agent-card-meta">
          {agent.issueCount !== undefined && agent.issueCount > 0 && (
            <span className="issue-count" title={`${agent.issueCount} open issues`}>
              📋 {agent.issueCount}
            </span>
          )}
          <span className="last-seen">{timeAgo(agent.lastSeen)}</span>
        </div>
      </div>
    </div>
  );
}
