import type { Activity } from '../types';
import { timeAgo } from '../utils';

const ACTION_COLORS: Record<string, string> = {
  '代码审查': 'action-review',
  '测试验证': 'action-test',
  '构建部署': 'action-deploy',
  '需求工作': 'action-plan',
  '心跳检测': 'action-heartbeat',
  '工作': 'action-work',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <div className="empty-state">No recent activity</div>;
  }

  return (
    <div className="activity-list">
      {activities.map((a) => (
        <div key={a.id} className={`activity-item ${ACTION_COLORS[a.action] || ''}`}>
          <div className="activity-avatar">{a.agentName.slice(0, 1)}</div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-name">{a.agentName}</span>
              <span className={`activity-action ${ACTION_COLORS[a.action] || ''}`}>
                {a.action}
              </span>
              <span className="activity-time" title={formatTime(a.timestamp)}>
                {timeAgo(a.timestamp)}
              </span>
            </div>
            <div className="activity-detail">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
