import type { Activity } from '../types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <div className="loading">No recent activity</div>;
  }

  return (
    <div className="activity-list">
      {activities.map((a) => (
        <div key={a.id} className="activity-item">
          <div className="activity-avatar">{a.agentName.slice(0, 1)}</div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-name">{a.agentName}</span>
              <span className="activity-action">{a.action}</span>
              <span className="activity-time">{timeAgo(a.timestamp)}</span>
            </div>
            <div className="activity-detail">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
