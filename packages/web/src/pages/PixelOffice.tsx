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
      className="pxo-popup"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pxo-popup-header">
        <div>
          <div className="pxo-popup-name">{displayName}</div>
          <div className="pxo-popup-status">
            <span className="pxo-popup-status-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span style={{ color }}>{label}</span>
          </div>
        </div>
        <button className="pxo-popup-close" onClick={onClose}>×</button>
      </div>

      {agent.lastSeen && (
        <div style={{ color: 'var(--pxo-text-dim)', fontSize: 11, marginBottom: 8 }}>
          最近活跃：{agent.lastSeen}
        </div>
      )}

      {agent.role && (
        <div style={{
          background: 'rgba(0,255,204,0.04)',
          border: '1px solid var(--pxo-border)',
          padding: '6px 10px', fontSize: 12, marginBottom: 8,
          color: 'var(--pxo-text-dim)',
        }}>
          {agent.role}
        </div>
      )}

      {agent.issueCount !== undefined && agent.issueCount > 0 && (
        <div style={{ fontSize: 12, color: 'var(--pxo-accent-amber)' }}>
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
  const [soundMuted, setSoundMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme to PixiApp
  useEffect(() => {
    if (pixiRef.current?.isReady()) {
      pixiRef.current.setTheme(theme);
    }
  }, [theme]);

  // Unlock audio on first interaction
  useEffect(() => {
    const unlock = () => {
      pixiRef.current?.unlockAudio();
      document.removeEventListener('pointerdown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  // Apply sound mute
  useEffect(() => {
    pixiRef.current?.setSoundMuted(soundMuted);
  }, [soundMuted]);

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
        setIsLoading(false);
        if (pendingAgentsRef.current) {
          pixi.updateAgents(pendingAgentsRef.current);
          pendingAgentsRef.current = null;
        }
      })
      .catch((err: unknown) => {
        setIsLoading(false);
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

      // Update team status on whiteboard
      const online = agents.filter((a) => a.status !== 'offline' && a.status !== 'error').length;
      const total = agents.length;
      const topScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
      pixiRef.current.updateTeamStatus(online, total, topScore);
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

  const onlineCount = agents?.filter((a) => a.status !== 'offline' && a.status !== 'error').length ?? 0;

  return (
    <div className="pxo-root">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="pxo-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 className="pxo-title">
            <span className="pxo-title-glyph">◈</span>
            像素办公室
          </h2>
          <div className="pxo-stats">
            <div className="pxo-stat">
              <span className="pxo-stat-dot" />
              <span className="pxo-stat-value">{onlineCount}</span>
              <span>/{agents?.length ?? 0} 在线</span>
            </div>
            <div className="pxo-stat">
              <span className="pxo-stat-dot pxo-stat-dot--amber" />
              <span>PTS: </span>
              <span className="pxo-stat-value">{leaderboard[0]?.score ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Theme Switcher */}
        <div className="pxo-theme-switcher">
          <span className="pxo-theme-label">THEME</span>
          {(Object.keys(THEME_LABELS) as OfficeTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`pxo-theme-btn${theme === t ? ' pxo-theme-btn--active' : ''}`}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
          <button
            className="pxo-theme-btn"
            onClick={() => setSoundMuted((m) => !m)}
            title={soundMuted ? '🔇 开启音效' : '🔊 关闭音效'}
            style={{ marginLeft: 8 }}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="pxo-body">
        {/* Left: Canvas */}
        <div>
          {error && <div className="pxo-error">数据加载失败：{error}</div>}

          {initError && (
            <div className="pxo-error" style={{ marginBottom: 12 }}>
              ⚠️ 像素引擎初始化失败（可能不支持 WebGL）
              <br />
              <span style={{ fontSize: 11, color: 'var(--pxo-text-dim)' }}>{initError}</span>
              <br />
              <a href="/" style={{ color: 'var(--pxo-accent-cyan)', fontSize: 12 }}>切换到团队总览 →</a>
            </div>
          )}

          {/* Loading transition overlay */}
          {isLoading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'var(--pxo-bg)',
              zIndex: 50,
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: 'var(--pxo-accent-cyan)',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                marginBottom: 20,
                textShadow: 'var(--pxo-glow-cyan)',
                animation: 'pxo-blink 1s step-end infinite',
              }}>
                ◈ INITIALIZING
              </div>
              {/* Loading bar */}
              <div style={{
                width: 160,
                height: 2,
                background: 'var(--pxo-border)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0, left: '-100%',
                  width: '100%', height: '100%',
                  background: 'var(--pxo-accent-cyan)',
                  boxShadow: '0 0 8px var(--pxo-accent-cyan)',
                  animation: 'pxo-scan 1.2s linear infinite',
                }} />
              </div>
              <style>{`
                @keyframes pxo-scan {
                  from { left: -100%; }
                  to { left: 100%; }
                }
                @keyframes pxo-blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.3; }
                }
              `}</style>
            </div>
          )}

          {!initError && (
            <div className="pxo-canvas-wrap">
              <canvas
                ref={canvasRef}
                style={{ display: 'block', imageRendering: 'pixelated', cursor: 'grab' }}
              />
              {/* Zoom controls */}
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                display: 'flex', gap: 4, alignItems: 'center',
                background: 'rgba(10,10,15,0.85)',
                border: '1px solid var(--pxo-border)',
                padding: '4px 8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: 'var(--pxo-text-dim)',
              }}>
                <button
                  onClick={() => pixiRef.current?.setScale((pixiRef.current as any)._scale * 0.9)}
                  style={{ background: 'none', border: 'none', color: 'var(--pxo-text-dim)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                  title="缩小"
                >−</button>
                <span style={{ minWidth: 36, textAlign: 'center' }}>
                  {Math.round((pixiRef.current as any)?._scale * 100)}%
                </span>
                <button
                  onClick={() => pixiRef.current?.setScale((pixiRef.current as any)._scale * 1.1)}
                  style={{ background: 'none', border: 'none', color: 'var(--pxo-text-dim)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                  title="放大"
                >+</button>
                <span style={{ borderLeft: '1px solid var(--pxo-border)', marginLeft: 4, paddingLeft: 8 }}>
                  <button
                    onClick={() => pixiRef.current?.resetView()}
                    style={{ background: 'none', border: 'none', color: 'var(--pxo-text-dim)', cursor: 'pointer', fontSize: 10 }}
                    title="重置视图"
                  >RESET</button>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div>
          <Leaderboard
            entries={leaderboard}
            onAgentClick={(agentId) => {
              pixiRef.current?.highlightAgent(agentId);
              const agent = agents?.find((a) => a.id === agentId);
              if (agent) setPopup({ agent, x: window.innerWidth / 2, y: window.innerHeight / 2 });
            }}
          />
        </div>
      </div>

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
