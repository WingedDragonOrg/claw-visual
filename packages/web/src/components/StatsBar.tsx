import type { DashboardData } from '../types';

const STATS: { key: keyof DashboardData; label: string; color: string }[] = [
  { key: 'online', label: '在线', color: 'var(--green)' },
  { key: 'busy', label: '忙碌', color: 'var(--orange)' },
  { key: 'away', label: '离开', color: 'var(--yellow)' },
  { key: 'error', label: '异常', color: 'var(--red)' },
  { key: 'offline', label: '离线', color: 'var(--gray)' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export function StatsBar({ data }: { data: DashboardData }) {
  return (
    <div className="stats-bar-wrapper">
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {data.totalAgents}
          </div>
          <div className="stat-label">成员</div>
        </div>
        {STATS.map((s) => (
          <div key={s.key} className="stat-item">
            <div className="stat-value" style={{ color: s.color }}>
              {data[s.key] as number}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
        <div className="stat-item stat-item-issues">
          <div className="stat-value" style={{ color: 'var(--blue)' }}>
            {data.openIssues ?? 0}
          </div>
          <div className="stat-label">Issues</div>
        </div>
      </div>
      <div className="stats-updated">Updated {timeAgo(data.lastUpdated)}</div>
    </div>
  );
}
