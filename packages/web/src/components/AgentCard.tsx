import { Link } from 'react-router-dom';
import { useRef, useCallback } from 'react';
import type { Agent, AgentStatus } from '../types';
import { timeAgo } from '../utils';

const STATUS_LABELS: Record<AgentStatus, string> = {
  online: '在线',
  away: '离开',
  busy: '忙碌中',
  error: '异常',
  offline: '离线',
};

/**
 * 3D tilt effect hook.
 * Desktop: rotateX/rotateY based on mouse position.
 * Mobile (< 768px): skips tilt, uses CSS hover scale instead.
 * Respects prefers-reduced-motion.
 */
function useTilt() {
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Skip on mobile
    if (window.matchMedia('(max-width: 768px)').matches) return;
    // Skip if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

export function AgentCard({ agent }: { agent: Agent }) {
  const { cardRef, handleMouseMove, handleMouseLeave } = useTilt();

  return (
    <Link
      to={`/agents/${agent.id}`}
      className="agent-card"
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="agent-card-header">
        <div className={`agent-avatar ${agent.status}`}>{agent.avatar}</div>
        <div className="agent-info">
          <h3>{agent.name}</h3>
          {agent.role && <span className="role">{agent.role}</span>}
        </div>
      </div>
      {agent.lastActivity && (
        <div className="agent-card-activity">
          <span className="activity-preview">{agent.lastActivity}</span>
        </div>
      )}
      <div className="agent-card-body">
        <span className={`status-badge ${agent.status}`}>
          <span className="dot" />
          {STATUS_LABELS[agent.status]}
        </span>
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
