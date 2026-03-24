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
          {entries.slice(0, 10).map((entry) => {
            const maxScore = entries[0]?.score || 1;
            const progress = Math.min(entry.score / maxScore, 1);
            const medalColor = entry.rank <= 3 ? MEDAL_COLORS[entry.rank - 1] : null;
            return (
              <div
                key={entry.agentId}
                onClick={() => onAgentClick?.(entry.agentId)}
                className="pxo-leaderboard-entry"
                style={{
                  padding: '8px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  cursor: onAgentClick ? 'pointer' : 'default',
                  borderBottom: '1px solid var(--pxo-border)',
                  minHeight: '44px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Row 1: rank + name + status + score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Rank */}
                  <span
                    style={{
                      width: '24px',
                      fontSize: entry.rank <= 3 ? '16px' : '12px',
                      textAlign: 'center',
                      color: medalColor ?? 'var(--pxo-text-dim)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: entry.rank <= 3 ? 700 : 400,
                      textShadow: medalColor ? `0 0 8px ${medalColor}` : 'none',
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
                    color: medalColor ?? 'var(--pxo-text)',
                    fontWeight: entry.rank <= 3 ? 600 : 400,
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
                    flexShrink: 0,
                  }} />

                  {/* Score */}
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    minWidth: '44px',
                    textAlign: 'right',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: medalColor ?? 'var(--pxo-accent-cyan)',
                    textShadow: medalColor ? `0 0 6px ${medalColor}` : 'none',
                  }}>
                    {Math.round(entry.score)}
                  </span>
                </div>

                {/* Row 2: score progress bar */}
                <div style={{
                  height: '2px',
                  background: 'var(--pxo-border)',
                  borderRadius: '1px',
                  overflow: 'hidden',
                  marginLeft: '34px',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    background: medalColor ?? 'var(--pxo-accent-cyan)',
                    boxShadow: `0 0 4px ${medalColor ?? 'var(--pxo-accent-cyan)'}`,
                    borderRadius: '1px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            );
          })}

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
