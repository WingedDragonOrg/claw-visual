import type { DashboardData } from '../types';
import { timeAgo } from '../utils';
import { useCountUp } from '../hooks/useCountUp';
import { StaggerIn } from '../components/StaggerIn';

const STATS: { key: keyof DashboardData; label: string; color: string; icon: string; iconClass: string }[] = [
  { key: 'online', label: 'Online', color: 'var(--green)', icon: '\u25CF', iconClass: 'online' },
  { key: 'busy', label: 'Busy', color: 'var(--orange)', icon: '\u25CF', iconClass: 'busy' },
  { key: 'away', label: 'Away', color: 'var(--yellow)', icon: '\u25CF', iconClass: 'away' },
  { key: 'error', label: 'Error', color: 'var(--red)', icon: '\u25CF', iconClass: 'error' },
  { key: 'offline', label: 'Offline', color: 'var(--gray)', icon: '\u25CF', iconClass: 'offline' },
];

function StatPill({ value, label, color, icon, iconClass, delay }: {
  value: number;
  label: string;
  color: string;
  icon: string;
  iconClass: string;
  delay: number;
}) {
  const displayValue = useCountUp(value, 800);

  return (
    <StaggerIn delay={delay}>
      <div className="stat-pill">
        <div className={`stat-icon ${iconClass}`}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="stat-info">
          <div className="stat-value" style={{ color }}>{displayValue}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </StaggerIn>
  );
}

export function StatsBar({ data }: { data: DashboardData }) {
  return (
    <div className="stats-bar-wrapper">
      <div className="stats-bar">
        <StatPill value={data.totalAgents} label="Total" color="var(--accent)" icon="&#9632;" iconClass="total" delay={0} />
        {STATS.map((s, i) => (
          <StatPill
            key={s.key}
            value={data[s.key] as number}
            label={s.label}
            color={s.color}
            icon={s.icon}
            iconClass={s.iconClass}
            delay={(i + 1) * 50}
          />
        ))}
        <StatPill value={data.openIssues ?? 0} label="Issues" color="var(--blue)" icon="&#9679;" iconClass="issues" delay={STATS.length * 50 + 50} />
      </div>
      <div className="stats-updated">Updated {timeAgo(data.lastUpdated)}</div>
    </div>
  );
}
