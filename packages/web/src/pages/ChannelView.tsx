import { useState, useCallback } from 'react';
import { fetchChannels, fetchChannelAgents } from '../api';
import { usePolling } from '../hooks';
import { timeAgo } from '../utils';
import type { Channel, Agent } from '../types';

const TYPE_LABELS: Record<Channel['type'], string> = {
  discord: 'Discord',
  telegram: 'Telegram',
  signal: 'Signal',
  other: 'Other',
};

function ChannelCard({ channel }: { channel: Channel }) {
  const [expanded, setExpanded] = useState(false);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const hasOnline = channel.onlineCount > 0;

  const handleClick = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!agents) {
      setLoadingAgents(true);
      try {
        const data = await fetchChannelAgents(channel.id);
        setAgents(data);
      } catch {
        setAgents([]);
      } finally {
        setLoadingAgents(false);
      }
    }
  };

  return (
    <div
      className={`channel-card ${hasOnline ? 'channel-online' : 'channel-offline'}`}
      onClick={handleClick}
    >
      <div className="channel-card-header">
        <div className="channel-info">
          <h3>{channel.name}</h3>
          <span className={`channel-type-badge type-${channel.type}`}>
            {TYPE_LABELS[channel.type]}
          </span>
        </div>
        <div className="channel-agent-count">
          <span className="channel-online-count">{channel.onlineCount}</span>
          <span className="channel-total-count">/ {channel.agentCount}</span>
        </div>
      </div>

      {channel.lastActivity && (
        <div className="channel-meta">
          <span className="last-seen">{timeAgo(channel.lastActivity)}</span>
        </div>
      )}

      {expanded && (
        <div className="channel-agents">
          {loadingAgents ? (
            <div className="channel-agents-loading">Loading agents...</div>
          ) : agents && agents.length > 0 ? (
            agents.map((agent) => (
              <div key={agent.id} className="channel-agent-item">
                <span className={`dot ${agent.status}`} />
                <span className="channel-agent-name">{agent.name}</span>
                <span className="channel-agent-role">{agent.role}</span>
                <span className={`status-badge ${agent.status}`}>
                  <span className="dot" />
                  {agent.status}
                </span>
              </div>
            ))
          ) : (
            <div className="channel-agents-loading">No agents found</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChannelView() {
  const channelsFetcher = useCallback(() => fetchChannels(), []);
  const { data: channels, loading, error, refresh } = usePolling<Channel[]>(channelsFetcher);

  return (
    <>
      <div className="header-right" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 1.5rem' }}>
        <span className="live-dot" title="Auto-refreshing every 30s" />
        <button className="refresh-btn" onClick={refresh}>
          ↻ Refresh
        </button>
      </div>

      {error && <div className="error-msg">API Error: {error}</div>}

      {loading ? (
        <div className="loading">Loading channel data...</div>
      ) : !channels || channels.length === 0 ? (
        <div className="empty-state">No channel data found</div>
      ) : (
        <section>
          <h2 className="section-title">
            Channels <span className="section-count">{channels.length}</span>
          </h2>
          <div className="channels-grid">
            {channels.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
        </section>
      )}

      <footer className="footer">
        <span>Claw Visual v0.1 · Powered by OpenClaw</span>
      </footer>
    </>
  );
}
