import type { DashboardData } from '../types';
import { timeAgo } from '../utils';
import { useCountUp } from '../hooks/useCountUp';

const STATS: { key: keyof DashboardData; label: string; color: string }[] = [
  { key: 'online', label: 'Online', color: 'var(--green)' },
  { key: 'busy', label: 'Busy', color: 'var(--orange)' },
  { key: 'away', label: 'Away', color: 'var(--yellow)' },
  { key: 'error', label: 'Error', color: 'var(--red)' },
  { key: 'offline', label: 'Offline', color: 'var(--gray)' },
];

function StatItem({ value, label, color }: { value: number; label: string; color: string }) {
  const displayValue = useCountUp(value, 800);
  return (
    <div className="issue-stat-item">
      <span className="issue-stat-value" style={{ color }}>{displayValue}</span>
      <span className="issue-stat-label">{label}</span>
    </div>
  );
}

export function StatsBar({ data }: { data: DashboardData }) {
  const onlineRate = data.totalAgents > 0 ? Math.round((data.online / data.totalAgents) * 100) : 0;

  return (
    <div className="team-stats">
      <div className="team-stats-panel">
        <h3 className="team-stats-title">Team Overview</h3>
        <div className="issue-stats-grid team-overview-grid">
          {STATS.map((s) => (
            <StatItem key={s.key} value={data[s.key] as number} label={s.label} color={s.color} />
          ))}
        </div>
        {data.totalAgents > 0 && (
          <div className="issue-progress-bar">
            <div
              className="issue-progress-fill"
              style={{ width: `${onlineRate}%` }}
            />
          </div>
        )}
        <div className="stats-updated" style={{ marginTop: 8 }}>
          {onlineRate}% online &middot; Updated {timeAgo(data.lastUpdated)}
        </div>
      </div>
    </div>
  );
}
