import type { DashboardData, GitHubSummary } from '../types';

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
  return (
    <div className="team-stats">
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
