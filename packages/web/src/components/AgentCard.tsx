import { Link } from 'react-router-dom';
import { useRef, useCallback, useMemo } from 'react';
import type { Agent } from '../types';
import { timeAgo } from '../utils';
import { StatusBadge } from './StatusBadge';

/**
 * 3D tilt effect hook.
 * Desktop: rotateX/rotateY based on mouse position.
 * Mobile (< 768px): skips tilt, uses CSS hover scale instead.
 * Respects prefers-reduced-motion.
 */
function useTilt() {
  const cardRef = useRef<HTMLAnchorElement>(null);
  // Evaluate once at hook init — avoids creating MediaQueryList on every mousemove
  const disabledRef = useRef(
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabledRef.current) return;

    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Map mouse position to ±5deg rotation
    const rotateY = ((e.clientX - cx) / (rect.width / 2)) * 5;
    const rotateX = -((e.clientY - cy) / (rect.height / 2)) * 5;

    el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    el.style.transition = 'transform 0.1s ease-out';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = '';
    el.style.transition = 'transform 0.3s ease-out, background var(--transition), border-color var(--transition), box-shadow var(--transition)';
  }, []);

  return { cardRef, handleMouseMove, handleMouseLeave };
}

/**
 * Generate stable gradient color from agent id.
 * Used for uninitialized agents without avatar.
 */
function useAgentGradient(id: string) {
  return useMemo(() => {
    // Hash the id to get consistent colors
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Generate two colors from the hash
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 40) % 360;

    return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 50%))`;
  }, [id]);
}

export function AgentCard({ agent }: { agent: Agent }) {
  const { cardRef, handleMouseMove, handleMouseLeave } = useTilt();
  const gradient = useAgentGradient(agent.id);

  const displayName = agent.uninitialized || !agent.name
    ? agent.id
    : agent.name;

  const displayRole = agent.uninitialized || !agent.role
    ? '未配置'
    : agent.role;

  const displayAvatar = agent.uninitialized || !agent.avatar
    ? agent.id.charAt(0).toUpperCase()
    : agent.avatar;

  return (
    <Link
      to={`/agents/${agent.id}`}
      className={`agent-card ${agent.uninitialized ? 'agent-card--uninitialized' : ''}`}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="agent-card-header">
        <div
          className={`agent-avatar ${agent.status}`}
          style={agent.uninitialized ? { background: gradient } : undefined}
        >
          {displayAvatar}
        </div>
        <div className="agent-info">
          <h3>
            {displayName}
            {agent.uninitialized && <span className="uninitialized-badge">未配置</span>}
          </h3>
          <span className={`role ${agent.uninitialized ? 'role--uninitialized' : ''}`}>
            {displayRole}
          </span>
        </div>
      </div>
      {agent.lastActivity && (
        <div className="agent-card-activity">
          <span className="activity-preview">{agent.lastActivity}</span>
        </div>
      )}
      <div className="agent-card-body">
        <StatusBadge status={agent.status} />
        <div className="agent-card-meta">
          {agent.issueCount !== undefined && agent.issueCount > 0 && (
            <span className="issue-count" title={`${agent.issueCount} open issues`}>
              {agent.issueCount} issues
            </span>
          )}
          <span className="last-seen">{timeAgo(agent.lastSeen)}</span>
        </div>
      </div>
    </Link>
  );
}
