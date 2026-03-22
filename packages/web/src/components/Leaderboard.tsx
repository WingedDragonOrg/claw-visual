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
    <div className="pxo-leaderboard">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="pxo-leaderboard-header"
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: collapsed ? 'none' : '1px solid var(--pxo-border)',
        }}
      >
        <span>◈ LEADERBOARD</span>
        <span style={{ fontSize: '11px', color: 'var(--pxo-text-dim)' }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.agentId}
              onClick={() => onAgentClick?.(entry.agentId)}
              className="pxo-leaderboard-entry"
              style={{
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: onAgentClick ? 'pointer' : 'default',
                borderBottom: '1px solid var(--pxo-border)',
                minHeight: '36px',
                boxSizing: 'border-box',
              }}
            >
              {/* Rank */}
              <span
                className="pxo-leaderboard-rank"
                style={{
                  width: '24px',
                  fontSize: entry.rank <= 3 ? '16px' : '12px',
                  textAlign: 'center',
                }}
              >
                {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
              </span>

              {/* Agent name */}
              <span style={{
                flex: 1,
                minWidth: 0,
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                lineHeight: '20px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--pxo-text)',
              }}>
                {entry.agentName}
              </span>

              {/* Status dot */}
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: STATUS_COLORS[entry.status] ?? '#64748b',
                boxShadow: `0 0 4px ${STATUS_COLORS[entry.status] ?? '#64748b'}`,
              }} />

              {/* Score */}
              <span className="pxo-leaderboard-score" style={{
                fontSize: '13px',
                fontWeight: 700,
                minWidth: '50px',
                textAlign: 'right',
              }}>
                {Math.round(entry.score)}
              </span>
            </div>
          ))}

          {entries.length === 0 && (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--pxo-text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            }}>
              暂无数据
            </div>
          )}
        </div>
      )}
    </div>
  );
}
