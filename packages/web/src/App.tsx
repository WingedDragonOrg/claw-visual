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
          <h1>🐾 Claw Visual</h1>
          <p>团队作战室 · Team War Room</p>
        </div>
        <div className="header-right">
          <span className="live-dot" title="Auto-refreshing every 30s" />
          <button className="refresh-btn" onClick={refresh}>
            ↻ Refresh
          </button>
        </div>
      </header>

      {agentsError && <div className="error-msg">⚠ API Error: {agentsError}</div>}

      {loading ? (
        <div className="loading">Loading team data...</div>
      ) : (
        <>
          {dashboard && <StatsBar data={dashboard} />}

          <section>
            <h2 className="section-title">
              成员 <span className="section-count">{agents?.length ?? 0}</span>
            </h2>
            <div className="agents-grid">
              {agents?.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </section>

          {dashboard && dashboard.recentActivities.length > 0 && (
            <section className="activity-section">
              <h2 className="section-title">
                活动流 <span className="section-count">{dashboard.recentActivities.length}</span>
              </h2>
              <ActivityFeed activities={dashboard.recentActivities} />
            </section>
          )}
        </>
      )}

      <footer className="footer">
        <span>Claw Visual v0.1 · Powered by OpenClaw</span>
      </footer>
    </div>
  );
}
