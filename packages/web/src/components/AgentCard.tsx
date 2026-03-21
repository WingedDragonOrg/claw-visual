import { Link } from 'react-router-dom';
import type { Agent, AgentStatus } from '../types';
import { timeAgo } from '../utils';

const STATUS_LABELS: Record<AgentStatus, string> = {
  online: '\u5728\u7EBF',
  away: '\u79BB\u5F00',
  busy: '\u5FD9\u7896\u4E2D',
  error: '\u5F02\u5E38',
  offline: '\u79BB\u7EBF',
};

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link to={`/agents/${agent.id}`} className={`agent-card`}>
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
              {agent.issueCount} issues
            </span>
          )}
          <span className="last-seen">{timeAgo(agent.lastSeen)}</span>
        </div>
      </div>
    </Link>
  );
}
