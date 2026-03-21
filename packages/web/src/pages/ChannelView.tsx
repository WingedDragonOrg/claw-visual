import { useState, useCallback } from 'react';
import { fetchChannels, fetchChannelAgents } from '../api';
import { usePolling } from '../hooks';
import { timeAgo } from '../utils';
import { StaggerIn } from '../components/StaggerIn';
import type { Channel, Agent } from '../types';

const TYPE_ICONS: Record<Channel['type'], string> = {
  discord: '\uD83C\uDFAE',
  telegram: '\u2708\uFE0F',
  signal: '\uD83D\uDD12',
  other: '\uD83D\uDCAC',
};

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
      className={`channel-card`}
      onClick={handleClick}
    >
      <div className="channel-card-header">
        <div className="channel-info">
          <h3>{channel.name}</h3>
          <span className={`channel-type-badge type-${channel.type}`}>
            <span className="channel-type-icon">{TYPE_ICONS[channel.type]}</span>
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

      {/* Avatar stack preview */}
      {!expanded && agents && agents.length > 0 && (
        <div className="channel-avatar-stack">
          {agents.slice(0, 5).map((agent) => (
            <div key={agent.id} className={`avatar-item ${agent.status}`} title={agent.name}>
              {agent.avatar}
            </div>
          ))}
          {agents.length > 5 && (
            <div className="avatar-more">+{agents.length - 5}</div>
          )}
        </div>
      )}

      {/* Show avatar stack when not yet loaded but has online count */}
      {!expanded && !agents && hasOnline && (
        <div className="channel-avatar-stack">
          {Array.from({ length: Math.min(channel.onlineCount, 3) }).map((_, i) => (
            <div key={i} className="avatar-item online" style={{ opacity: 1 - i * 0.2 }}>
              &#183;
            </div>
          ))}
          {channel.agentCount > 3 && (
            <div className="avatar-more">+{channel.agentCount - 3}</div>
          )}
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

function ChannelSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div>
          <div className="skeleton skeleton-line w-60" style={{ height: 14 }} />
          <div className="skeleton skeleton-line w-40" style={{ height: 10, marginTop: 6 }} />
        </div>
      </div>
      <div className="skeleton-body" style={{ marginTop: 12 }}>
        <div className="skeleton skeleton-line w-80" />
      </div>
    </div>
  );
}

export function ChannelView() {
  const channelsFetcher = useCallback(() => fetchChannels(), []);
  const { data: channels, loading, error, refresh } = usePolling<Channel[]>(channelsFetcher);

  return (
    <>
      <div className="page-header">
        <span className="live-dot" title="Auto-refreshing every 30s" />
        <button className="refresh-btn" onClick={refresh}>Refresh</button>
      </div>

      {error && <div className="error-msg">API Error: {error}</div>}

      {loading ? (
        <div className="channels-grid">
          {Array.from({ length: 4 }).map((_, i) => <ChannelSkeleton key={i} />)}
        </div>
      ) : !channels || channels.length === 0 ? (
        <div className="empty-state">No channel data found</div>
      ) : (
        <section>
          <h2 className="section-title">
            Channels <span className="section-count">{channels.length}</span>
          </h2>
          <div className="channels-grid">
            {channels.map((ch, i) => (
              <StaggerIn key={ch.id} delay={i * 50}>
                <ChannelCard channel={ch} />
              </StaggerIn>
            ))}
          </div>
        </section>
      )}

      <footer className="footer">
        <span>Claw Visual v0.1 &middot; Powered by OpenClaw</span>
      </footer>
    </>
  );
}
