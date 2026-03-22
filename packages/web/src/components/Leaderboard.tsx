import { useState } from 'react';
import type { LeaderboardEntry } from '../hooks/useGamification';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onAgentClick?: (agentId: string) => void;
}

const MEDAL_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];
const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  busy: '#f59e0b',
  away: '#94a3b8',
  offline: '#64748b',
  error: '#ef4444',
};

export function Leaderboard({ entries, onAgentClick }: LeaderboardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="leaderboard" style={{
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: collapsed ? 'none' : '1px solid var(--glass-border)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '14px' }}>🏆 积分榜</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.agentId}
              onClick={() => onAgentClick?.(entry.agentId)}
              style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: onAgentClick ? 'pointer' : 'default',
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              {/* Rank */}
              <span style={{
                width: '24px',
                fontWeight: 700,
                fontSize: '14px',
                color: entry.rank <= 3 ? MEDAL_COLORS[entry.rank - 1] : 'var(--text-secondary)',
                textAlign: 'center',
              }}>
                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
              </span>

              {/* Agent name */}
              <span style={{
                flex: 1,
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {entry.agentName}
              </span>

              {/* Status dot */}
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: STATUS_COLORS[entry.status] ?? '#64748b',
              }} />

              {/* Score */}
              <span style={{
                fontSize: '14px',
                fontWeight: 700,
                minWidth: '50px',
                textAlign: 'right',
                fontFamily: 'monospace',
              }}>
                {Math.round(entry.score)}
              </span>
            </div>
          ))}

          {entries.length === 0 && (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '13px',
            }}>
              暂无数据
            </div>
          )}
        </div>
      )}
    </div>
  );
}
