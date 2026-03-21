import type { DashboardData } from '../types';
import { timeAgo } from '../utils';

const STATS: { key: keyof DashboardData; label: string; color: string; icon: string; iconClass: string }[] = [
  { key: 'online', label: 'Online', color: 'var(--green)', icon: '\u25CF', iconClass: 'online' },
  { key: 'busy', label: 'Busy', color: 'var(--orange)', icon: '\u25CF', iconClass: 'busy' },
  { key: 'away', label: 'Away', color: 'var(--yellow)', icon: '\u25CF', iconClass: 'away' },
  { key: 'error', label: 'Error', color: 'var(--red)', icon: '\u25CF', iconClass: 'error' },
  { key: 'offline', label: 'Offline', color: 'var(--gray)', icon: '\u25CF', iconClass: 'offline' },
];

export function StatsBar({ data }: { data: DashboardData }) {
  return (
    <div className="stats-bar-wrapper">
      <div className="stats-bar">
        <div className="stat-pill">
          <div className="stat-icon total">
            <span style={{ color: 'var(--accent)' }}>&#9632;</span>
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{data.totalAgents}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        {STATS.map((s) => (
          <div key={s.key} className="stat-pill">
            <div className={`stat-icon ${s.iconClass}`}>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{data[s.key] as number}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
        <div className="stat-pill">
          <div className="stat-icon issues">
            <span style={{ color: 'var(--blue)' }}>&#9679;</span>
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{data.openIssues ?? 0}</div>
            <div className="stat-label">Issues</div>
          </div>
        </div>
      </div>
      <div className="stats-updated">Updated {timeAgo(data.lastUpdated)}</div>
    </div>
  );
}
