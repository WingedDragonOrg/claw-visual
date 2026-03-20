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
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  return `${Math.floor(hr / 24)} 天前`;
}

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="agent-card">
      <div className="agent-card-header">
        <div className={`agent-avatar ${agent.status}`}>{agent.avatar}</div>
        <div className="agent-info">
          <h3>{agent.name}</h3>
          <span className="role">{agent.role}</span>
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
        <span className="last-seen">{timeAgo(agent.lastSeen)}</span>
      </div>
    </div>
  );
}
