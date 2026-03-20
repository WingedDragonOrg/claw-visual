import type { DashboardData } from '../types';

const STATS: { key: keyof DashboardData; label: string; color: string }[] = [
  { key: 'online', label: '在线', color: 'var(--green)' },
  { key: 'busy', label: '忙碌', color: 'var(--orange)' },
  { key: 'away', label: '离开', color: 'var(--yellow)' },
  { key: 'error', label: '异常', color: 'var(--red)' },
  { key: 'offline', label: '离线', color: 'var(--gray)' },
];

export function StatsBar({ data }: { data: DashboardData }) {
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <div className="stat-value" style={{ color: 'var(--accent)' }}>
          {data.totalAgents}
        </div>
        <div className="stat-label">Total</div>
      </div>
      {STATS.map((s) => (
        <div key={s.key} className="stat-item">
          <div className="stat-value" style={{ color: s.color }}>
            {data[s.key] as number}
          </div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
