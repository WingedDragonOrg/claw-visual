import type { DashboardData, GitHubSummary } from '../types';
import { useCountUp } from '../hooks/useCountUp';

interface Props {
  dashboard: DashboardData;
  issues: GitHubSummary | null;
}

function formatAvgTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24 * 10) / 10;
  return `${days}d`;
}

export function TeamStats({ dashboard, issues }: Props) {
  const { totalAgents, online } = dashboard;
  const onlineRate = totalAgents > 0 ? Math.round((online / totalAgents) * 100) : 0;
  const animatedRate = useCountUp(onlineRate, 1500);

  return (
    <div className="team-stats">
      <div className="team-stats-panel">
        <h3 className="team-stats-title">Online Rate</h3>
        <div className="online-rate-display">
          <div className="online-rate-ring">
            <svg viewBox="0 0 80 80" className="rate-ring-svg">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke="var(--green)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(animatedRate / 100) * 213.6} 213.6`}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <span className="rate-ring-value">{animatedRate}%</span>
          </div>
          <div className="online-rate-detail">
            <span className="online-rate-count">{online} / {totalAgents}</span>
            <span className="online-rate-label">agents online</span>
          </div>
        </div>
      </div>

      <div className="team-stats-panel">
        <h3 className="team-stats-title">Issues</h3>
        <div className="issue-stats-grid">
          <div className="issue-stat-item">
            <span className="issue-stat-value issue-stat-open">{issues?.open ?? dashboard.openIssues}</span>
            <span className="issue-stat-label">Open</span>
          </div>
          <div className="issue-stat-item">
            <span className="issue-stat-value issue-stat-closed">{issues?.closed ?? 0}</span>
            <span className="issue-stat-label">Closed</span>
          </div>
          <div className="issue-stat-item">
            <span className="issue-stat-value issue-stat-avg">
              {issues && issues.avgCloseTimeHours > 0 ? formatAvgTime(issues.avgCloseTimeHours) : '--'}
            </span>
            <span className="issue-stat-label">Avg Close</span>
          </div>
        </div>
        {issues && (issues.open + issues.closed) > 0 && (
          <div className="issue-progress-bar">
            <div
              className="issue-progress-fill"
              style={{ width: `${(issues.closed / (issues.open + issues.closed)) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
