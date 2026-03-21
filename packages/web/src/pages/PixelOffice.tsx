import { useRef, useEffect, useCallback, useState } from 'react';
import { fetchAgents } from '../api';
import { usePolling } from '../hooks';
import { PixiApp } from '../pixel/PixiApp';
import { SCENE_W, SCENE_H } from '../pixel/SceneLayout';
import type { Agent } from '../types';

const STATUS_META: { status: Agent['status']; label: string; color: string }[] = [
  { status: 'online',  label: '在线（工作区）',  color: '#22c55e' },
  { status: 'busy',    label: '忙碌（工作区）',  color: '#f97316' },
  { status: 'away',    label: '离开（休息区）',  color: '#eab308' },
  { status: 'offline', label: '离线',           color: '#6b7280' },
  { status: 'error',   label: '异常',           color: '#ef4444' },
];

function Legend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '8px 0', fontSize: 11, color: 'var(--text-secondary)' }}>
      {STATUS_META.map(({ status, label, color }) => (
        <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, display: 'inline-block', background: color, borderRadius: 2, flexShrink: 0 }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiRef = useRef<PixiApp | null>(null);
  const pendingAgentsRef = useRef<Agent[] | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const agentsFetcher = useCallback(() => fetchAgents(), []);
  const { data: agents, error } = usePolling<Agent[]>(agentsFetcher);

  useEffect(() => {
    if (!canvasRef.current) return;
    const pixi = new PixiApp();
    pixiRef.current = pixi;

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
        console.error('[PixelOffice] init failed:', err);
      });

    return () => pixi.destroy();
  }, []);

  useEffect(() => {
    if (!agents) return;
    if (pixiRef.current?.isReady()) {
      pixiRef.current.updateAgents(agents);
    } else {
      pendingAgentsRef.current = agents;
    }
  }, [agents]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h2 className="section-title" style={{ margin: 0 }}>🎮 像素办公室</h2>
        {agents && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {agents.length} agents · 在线 {agents.filter((a) => a.status === 'online').length}
          </span>
        )}
      </div>

      <Legend />

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
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
          <canvas
            ref={canvasRef}
            width={SCENE_W}
            height={SCENE_H}
            style={{ width: '100%', height: 'auto', display: 'block', imageRendering: 'pixelated' }}
          />
        </div>
      )}
    </div>
  );
}
