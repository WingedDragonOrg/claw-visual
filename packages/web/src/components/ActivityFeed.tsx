import type { Activity } from '../types';

const ACTION_COLORS: Record<string, string> = {
  '代码审查': 'action-review',
  '测试验证': 'action-test',
  '构建部署': 'action-deploy',
  '需求工作': 'action-plan',
  '心跳检测': 'action-heartbeat',
  '工作': 'action-work',
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
