import { useCallback } from 'react';
import { fetchAgents, fetchDashboard } from './api';
import { usePolling } from './hooks';
import { AgentCard } from './components/AgentCard';
import { ActivityFeed } from './components/ActivityFeed';
import { StatsBar } from './components/StatsBar';
import type { Agent, DashboardData } from './types';

export function App() {
  const agentsFetcher = useCallback(() => fetchAgents(), []);
  const dashFetcher = useCallback(() => fetchDashboard(), []);

  const { data: agents, loading: agentsLoading, error: agentsError, refresh } = usePolling<Agent[]>(agentsFetcher);
  const { data: dashboard, loading: dashLoading } = usePolling<DashboardData>(dashFetcher);

  const loading = agentsLoading && dashLoading;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Claw Visual</h1>
          <p>Team Status Dashboard</p>
        </div>
        <div className="header-right">
          <span className="live-dot" title="Auto-refreshing every 30s" />
          <button className="refresh-btn" onClick={refresh}>
            Refresh
          </button>
        </div>
      </header>

      {agentsError && <div className="error-msg">API Error: {agentsError}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {dashboard && <StatsBar data={dashboard} />}

          <section>
            <h2 className="section-title">Members</h2>
            <div className="agents-grid">
              {agents?.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </section>

          {dashboard && (
            <section className="activity-section">
              <h2 className="section-title">Recent Activity</h2>
              <ActivityFeed activities={dashboard.recentActivities} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
