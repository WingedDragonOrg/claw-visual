import { useState } from 'react';
import type { Activity } from '../types';
import { timeAgo } from '../utils';

const ACTION_CLASSES: Record<string, string> = {
  '代码审查': 'action-review',
  '测试验证': 'action-test',
  '构建部署': 'action-deploy',
  '需求工作': 'action-plan',
  '心跳检测': 'action-heartbeat',
  '工作': 'action-work',
};

const ACTION_NODES: Record<string, string> = {
  '代码审查': 'node-review',
  '测试验证': 'node-test',
  '构建部署': 'node-deploy',
  '需求工作': 'node-plan',
  '心跳检测': 'node-heartbeat',
  '工作': 'node-work',
};

const ACTION_ICONS: Record<string, string> = {
  '代码审查': '🔍',
  '测试验证': '✅',
  '构建部署': '🚀',
  '需求工作': '📋',
  '心跳检测': '💓',
  '工作': '⚙️',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ActivityItem({ a }: { a: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = a.fullDetail && a.fullDetail !== a.detail;

  return (
    <div
      key={a.id}
      className={`activity-item ${hasMore ? 'activity-expandable' : ''} ${expanded ? 'activity-expanded' : ''}`}
      onClick={() => hasMore && setExpanded((e) => !e)}
    >
      <div className={`activity-node ${ACTION_NODES[a.action] || 'node-work'}`}>
        <span>{ACTION_ICONS[a.action] || '⚙️'}</span>
      </div>
      <div className="activity-avatar">{a.agentName.slice(0, 1)}</div>
      <div className="activity-content">
        <div className="activity-header">
          <span className="activity-name">{a.agentName}</span>
          {a.source && (
            <span className="activity-source" title={a.source}>📍{a.source}</span>
          )}
          <span className={`activity-action ${ACTION_CLASSES[a.action] || ''}`}>
            {a.action}
          </span>
          <span className="activity-time" title={formatTime(a.timestamp)}>
            {timeAgo(a.timestamp)}
          </span>
          {hasMore && (
            <span className="activity-expand-icon">{expanded ? '▼' : '▶'}</span>
          )}
        </div>
        <div className="activity-detail">
          {expanded && hasMore ? a.fullDetail : a.detail}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <div className="empty-state">No recent activity</div>;
  }

  return (
    <div className="activity-list">
      {activities.map((a) => (
        <ActivityItem key={a.id} a={a} />
      ))}
    </div>
  );
}
