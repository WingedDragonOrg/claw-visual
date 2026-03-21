import { useRef, useEffect, useCallback } from 'react';
import { fetchAgents } from '../api';
import { usePolling } from '../hooks';
import { PixiApp } from '../pixel/PixiApp';
import type { Agent } from '../types';

const STATUS_LABELS: Record<Agent['status'], string> = {
  online: '在线',
  busy:   '忙碌中',
  away:   '离开',
  offline:'离线',
  error:  '异常',
};

const STATUS_COLORS: Record<Agent['status'], string> = {
  online:  '#22c55e',
  busy:    '#f97316',
  away:    '#eab308',
  offline: '#6b7280',
  error:   '#ef4444',
};

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
      {(Object.entries(STATUS_LABELS) as [Agent['status'], string][]).map(([s, label]) => (
        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, display: 'inline-block', background: STATUS_COLORS[s], borderRadius: 2 }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * Pixel Office tab — PixiJS canvas with Agent placeholder sprites.
 * Sprite sheets will replace placeholders once assets arrive.
 */
export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixiRef = useRef<PixiApp | null>(null);

  const agentsFetcher = useCallback(() => fetchAgents(), []);
  const { data: agents, loading, error } = usePolling<Agent[]>(agentsFetcher);

  // Initialize PixiJS on mount, destroy on unmount
  useEffect(() => {
    if (!canvasRef.current) return;
    const pixi = new PixiApp();
    pixiRef.current = pixi;
    pixi.init(canvasRef.current).catch(console.error);
    return () => pixi.destroy();
  }, []);

  // Update sprites whenever agents data changes
  useEffect(() => {
    if (agents) pixiRef.current?.updateAgents(agents);
  }, [agents]);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 8 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          🎮 像素办公室
          <span className="section-count" style={{ marginLeft: 8 }}>
            {agents ? `${agents.length} agents` : ''}
          </span>
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          占位模式 · 等待美术资产
        </span>
      </div>

      <Legend />

      {error && <div className="error-msg">数据加载失败：{error}</div>}

      {loading && !agents && (
        <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          加载中…
        </div>
      )}

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 500, display: 'block' }}
        />
      </div>

      {agents && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          {agents.map((a) => (
            <span key={a.id} style={{ marginRight: 12 }}>
              <span style={{ color: STATUS_COLORS[a.status] }}>●</span> {a.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
