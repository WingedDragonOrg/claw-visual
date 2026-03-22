import { useRef, useEffect, useCallback, useState } from 'react';
import { fetchAgents, fetchIssues } from '../api';
import { usePolling } from '../hooks';
import { useGamification } from '../hooks/useGamification';
import { Leaderboard } from '../components/Leaderboard';
import { PixiApp, type OfficeTheme } from '../pixel/PixiApp';
import type { Agent, GitHubSummary } from '../types';

const THEME_LABELS: Record<OfficeTheme, string> = {
  auto: '自动',
  day: '白天',
  night: '夜晚',
  dusk: '黄昏',
  holiday: '节日',
};

// ── Agent info popup ─────────────────────────────────────────────────────────
const STATUS_DISPLAY: Record<Agent['status'], { label: string; color: string }> = {
  online:  { label: '在线',  color: '#22c55e' },
  busy:    { label: '忙碌中', color: '#f97316' },
  away:    { label: '离开',  color: '#eab308' },
  offline: { label: '离线',  color: '#6b7280' },
  error:   { label: '异常',  color: '#ef4444' },
};

interface AgentPopupProps {
  agent: Agent;
  x: number;
  y: number;
  onClose: () => void;
}

function AgentPopup({ agent, x, y, onClose }: AgentPopupProps) {
  const { label, color } = STATUS_DISPLAY[agent.status];
  const displayName = agent.name.replace(/同学$/g, '');

  // Keep popup within viewport
  const popupW = 240;
  const safeX = Math.min(x, window.innerWidth - popupW - 12);
  const safeY = y - 10;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: safeX,
        top: safeY,
        zIndex: 300,
        width: popupW,
        background: 'rgba(12,12,26,0.96)',
        border: '3px solid #6b5a4a',
        borderRadius: 0, // pixel style = no rounded corners
        padding: '14px 16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '4px 4px 0 #3a3a50, 0 8px 24px rgba(0,0,0,0.5)',
        fontSize: 13,
        color: 'var(--text-primary)',
        imageRendering: 'pixelated',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{
            fontWeight: 600,
            fontSize: 15,
            marginBottom: 3,
            fontFamily: 'monospace', // pixel font feel
            letterSpacing: '0.5px',
          }}>{displayName}</div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, color,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>

      {agent.lastSeen && (
        <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 6 }}>
          最近活跃：{agent.lastSeen}
        </div>
      )}

      {agent.role && (
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 6,
          padding: '6px 10px', fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)',
        }}>
          {agent.role}
        </div>
      )}

      {agent.issueCount !== undefined && agent.issueCount > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          📋 {agent.issueCount} 个待处理 Issue
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiRef = useRef<PixiApp | null>(null);
  const pendingAgentsRef = useRef<Agent[] | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ agent: Agent; x: number; y: number } | null>(null);
  const [theme, setTheme] = useState<OfficeTheme>('auto');

  // Apply theme to PixiApp
  useEffect(() => {
    if (pixiRef.current?.isReady()) {
      pixiRef.current.setTheme(theme);
    }
  }, [theme]);

  const agentsFetcher = useCallback(() => fetchAgents(), []);
  const { data: agents, error } = usePolling<Agent[]>(agentsFetcher);

  const issuesFetcher = useCallback(() => fetchIssues(), []);
  const { data: githubSummary } = usePolling<GitHubSummary>(issuesFetcher);

  // Gamification
  const prevGithubSummaryRef = useRef<GitHubSummary | undefined>(undefined);
  const prevAgentStatusesRef = useRef<Map<string, string>>(new Map());
  const { leaderboard, tick, handleGitHubRefresh } = useGamification();

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return;
    const handler = () => setPopup(null);
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [popup]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const pixi = new PixiApp();
    pixiRef.current = pixi;

    // Wire click handler
    pixi.setClickHandler((agent, sx, sy) => {
      setPopup({ agent, x: sx, y: sy });
    });

    pixi.init(canvasRef.current)
      .then(() => {
        if (pendingAgentsRef.current) {
          pixi.updateAgents(pendingAgentsRef.current);
          pendingAgentsRef.current = null;
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setInitError(msg);
      });

    return () => pixi.destroy();
  }, []);

  useEffect(() => {
    if (!agents) return;
    if (pixiRef.current?.isReady()) {
      // Flash agents whose status changed (event feedback animation)
      const prev = prevAgentStatusesRef.current;
      agents.forEach((agent) => {
        const prevStatus = prev.get(agent.id);
        if (prevStatus && prevStatus !== agent.status) {
          pixiRef.current?.highlightAgent(agent.id);
        }
        prev.set(agent.id, agent.status);
      });

      pixiRef.current.updateAgents(agents);
      tick(agents);
      // Update popup agent data if open
      if (popup) {
        const updated = agents.find((a) => a.id === popup.agent.id);
        if (updated) setPopup((p) => p ? { ...p, agent: updated } : null);
      }
    } else {
      pendingAgentsRef.current = agents;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

  // Update whiteboard with GitHub issues data + award issue points
  useEffect(() => {
    if (!githubSummary) return;
    if (pixiRef.current?.isReady()) {
      pixiRef.current.updateWhiteboard(githubSummary);
    }
    handleGitHubRefresh(githubSummary, prevGithubSummaryRef.current);
    prevGithubSummaryRef.current = githubSummary;
  }, [githubSummary]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h2 className="section-title" style={{
            margin: 0,
            fontFamily: 'monospace',
            letterSpacing: '1px',
            textShadow: '2px 2px 0 #3a3a50',
          }}>🎮 像素办公室</h2>
          {agents && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {agents.length} agents · 在线 {agents.filter((a) => a.status === 'online' || a.status === 'busy').length}
            </span>
          )}
        </div>

        {/* Theme Switcher */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>主题：</span>
          {(Object.keys(THEME_LABELS) as OfficeTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                border: theme === t ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                borderRadius: 4,
                background: theme === t ? 'var(--accent-soft)' : 'transparent',
                color: theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-msg">数据加载失败：{error}</div>}

      {initError && (
        <div className="error-msg" style={{ marginBottom: 12 }}>
          ⚠️ 像素引擎初始化失败（可能不支持 WebGL）
          <br />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{initError}</span>
          <br />
          <a href="/" style={{ color: 'var(--accent)', fontSize: 12 }}>切换到团队总览 →</a>
        </div>
      )}

      {!initError && (
        <div
          style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)', position: 'relative' }}
        >
          <canvas
            ref={canvasRef}
            style={{ display: 'block', imageRendering: 'pixelated', cursor: 'grab' }}
          />
          {/* Zoom controls */}
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            display: 'flex', gap: 4, alignItems: 'center',
            background: 'rgba(12,12,26,0.8)',
            border: '1px solid var(--glass-border)',
            borderRadius: 8,
            padding: '4px 8px',
          }}>
            <button
              onClick={() => pixiRef.current?.setScale((pixiRef.current as any)._scale * 0.9)}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
              title="缩小"
            >−</button>
            <span style={{ fontSize: 11, color: '#888', minWidth: 36, textAlign: 'center' }}>
              {Math.round((pixiRef.current as any)?._scale * 100)}%
            </span>
            <button
              onClick={() => pixiRef.current?.setScale((pixiRef.current as any)._scale * 1.1)}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
              title="放大"
            >+</button>
            <button
              onClick={() => pixiRef.current?.resetView()}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11, padding: '0 4px', borderLeft: '1px solid #333', marginLeft: 2 }}
              title="重置视图"
            >重置</button>
          </div>

          {/* Leaderboard overlay */}
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            width: 220,
          }}>
            <Leaderboard
              entries={leaderboard}
              onAgentClick={(agentId) => {
                // Highlight agent in PixiApp
                pixiRef.current?.highlightAgent(agentId);
                const agent = agents?.find((a) => a.id === agentId);
                if (agent) setPopup({ agent, x: window.innerWidth / 2, y: window.innerHeight / 2 });
              }}
            />
          </div>
        </div>
      )}

      {popup && (
        <AgentPopup
          agent={popup.agent}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
