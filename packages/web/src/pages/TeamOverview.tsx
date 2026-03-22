import { useState, useCallback, useMemo } from 'react';
import { fetchAgents, fetchDashboard, fetchIssues } from '../api';
import { usePolling } from '../hooks';
import { AgentCard } from '../components/AgentCard';
import { ActivityFeed } from '../components/ActivityFeed';
import { StatsBar } from '../components/StatsBar';
import { TeamStats } from '../components/TeamStats';
import { Panel } from '../components/ui/Panel';
import type { Agent, AgentStatus, DashboardData, GitHubSummary } from '../types';
import { StaggerIn } from '../components/StaggerIn';

type FilterStatus = 'all' | AgentStatus;

const FILTERS: { value: FilterStatus; label: string; className: string }[] = [
  { value: 'all', label: 'All', className: '' },
  { value: 'online', label: 'Online', className: 'filter-online' },
  { value: 'busy', label: 'Busy', className: 'filter-busy' },
  { value: 'away', label: 'Away', className: 'filter-away' },
  { value: 'error', label: 'Error', className: 'filter-error' },
  { value: 'offline', label: 'Offline', className: 'filter-offline' },
];

function AgentSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton skeleton-avatar" />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-line w-60" />
          <div className="skeleton skeleton-line w-40" />
        </div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton skeleton-line w-full" />
        <div className="skeleton skeleton-line w-80" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="skeleton skeleton-stat" />
      ))}
    </div>
  );
}

export function TeamOverview() {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const agentsFetcher = useCallback(() => fetchAgents(), []);
  const dashFetcher = useCallback(() => fetchDashboard(), []);
  const issuesFetcher = useCallback(() => fetchIssues(), []);

  const { data: agents, loading: agentsLoading, error: agentsError, refresh } = usePolling<Agent[]>(agentsFetcher);
  const { data: dashboard, loading: dashLoading } = usePolling<DashboardData>(dashFetcher);
  const { data: issues } = usePolling<GitHubSummary>(issuesFetcher);

  const loading = agentsLoading && dashLoading;

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    if (filter === 'all') return agents;
    return agents.filter((a) => a.status === filter);
  }, [agents, filter]);

  const statusCounts = useMemo(() => {
    if (!agents) return {} as Record<FilterStatus, number>;
    const counts: Record<string, number> = { all: agents.length };
    for (const a of agents) {
      counts[a.status] = (counts[a.status] || 0) + 1;
    }
    return counts;
  }, [agents]);

  return (
    <div className="team-layout">
      {/* Collapsible sidebar */}
      <Panel
        side="left"
        title="Team Overview"
        defaultCollapsed={false}
        width={260}
      >
        {/* Stats summary */}
        {dashboard && <StatsBar data={dashboard} />}
        {dashboard && <TeamStats dashboard={dashboard} issues={issues} />}

        <hr className="ui-divider" />

        {/* Status filters */}
        <div className="sidebar-filters">
          <div className="sidebar-section-label">Filter by status</div>
          <div className="status-filter">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-btn ${f.className} ${filter === f.value ? 'active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                {statusCounts[f.value] !== undefined && (
                  <span className="count">{statusCounts[f.value]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Activity feed in sidebar */}
        {dashboard && dashboard.recentActivities.length > 0 && (
          <>
            <hr className="ui-divider" />
            <div className="sidebar-section-label">Recent Activity</div>
            <ActivityFeed activities={dashboard.recentActivities} />
          </>
        )}
      </Panel>

      {/* Main content */}
      <main className="team-main">
        <div className="page-header">
          <span className="live-dot" title="Auto-refreshing every 30s" />
          <button className="refresh-btn" onClick={refresh}>Refresh</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {agents?.length ?? 0} agents
          </span>
        </div>

        {agentsError && <div className="error-msg">API Error: {agentsError}</div>}

        {loading ? (
          <div className="agents-grid">
            {Array.from({ length: 6 }).map((_, i) => <AgentSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <section>
              <div className="agents-grid">
                {filteredAgents.map((agent, i) => (
                  <StaggerIn key={agent.id} delay={i * 50}>
                    <AgentCard agent={agent} />
                  </StaggerIn>
                ))}
                {filteredAgents.length === 0 && (
                  <div className="empty-state">No agents match this filter</div>
                )}
              </div>
            </section>
          </>
        )}

        <footer className="footer">
          <span>Claw Visual v0.1 &middot; Powered by OpenClaw</span>
        </footer>
      </main>
    </div>
  );
}
