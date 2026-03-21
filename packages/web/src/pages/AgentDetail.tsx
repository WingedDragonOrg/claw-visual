import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAgents, fetchActivity } from '../api';
import { timeAgo } from '../utils';
import { ActivityChart } from '../components/ActivityChart';
import { StaggerIn } from '../components/StaggerIn';
import type { Agent, Activity, AgentStatus } from '../types';

/**
 * Generate a stable gradient color based on agent id
 * Uses a hash function to create consistent colors
 */
function generateGradientColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 40%)`;
}

/**
 * Get display name for agent
 * Returns agent name or "id (未配置)" for uninitialized agents
 */
function getDisplayName(agent: Agent): string {
  if (agent.uninitialized || !agent.name) {
    return `${agent.id} (未配置)`;
  }
  return agent.name;
}

/**
 * Get avatar initials for agent
 * Uses first letter of id for uninitialized agents
 */
function getAvatarInitials(agent: Agent): string {
  if (agent.uninitialized || !agent.avatar) {
    return agent.id.charAt(0).toUpperCase();
  }
  return agent.avatar;
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  online: '在线',
  away: '离开',
  busy: '忙碌中',
  error: '异常',
  offline: '离线',
};

const STATUS_ICONS: Record<AgentStatus, string> = {
  online: '🟢',
  away: '🟡',
  busy: '🟠',
  error: '🔴',
  offline: '⚫',
};

const ACTION_CLASSES: Record<string, string> = {
  '代码审查': 'action-review',
  '测试验证': 'action-test',
  '构建部署': 'action-deploy',
  '需求工作': 'action-plan',
  '心跳检测': 'action-heartbeat',
  '工作': 'action-work',
};

const ACTION_NODES: Record<string, string> = {
  '代码审查': 'node-review',
  '测试验证': 'node-test',
  '构建部署': 'node-deploy',
  '需求工作': 'node-plan',
  '心跳检测': 'node-heartbeat',
  '工作': 'node-work',
};

const ACTION_ICONS: Record<string, string> = {
  '代码审查': '🔍',
  '测试验证': '✅',
  '构建部署': '🚀',
  '需求工作': '📋',
  '心跳检测': '💓',
  '工作': '⚙️',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - target.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

interface StatusSpan {
  status: AgentStatus;
  label: string;
  timeRange: string;
}

function inferStatusHistory(activities: Activity[], agent: Agent): StatusSpan[] {
  const spans: StatusSpan[] = [];

  // Current status
  spans.push({
    status: agent.status,
    label: STATUS_LABELS[agent.status],
    timeRange: agent.status === 'online'
      ? `过去 ${timeAgo(agent.lastSeen)} 内活跃`
      : `最后活跃: ${timeAgo(agent.lastSeen)}`,
  });

  if (activities.length < 2) return spans;

  // Infer past status from activity gaps
  const sorted = [...activities].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  let prevTime = new Date(sorted[0].timestamp);
  for (let i = 1; i < Math.min(sorted.length, 10); i++) {
    const curTime = new Date(sorted[i].timestamp);
    const gapMin = (prevTime.getTime() - curTime.getTime()) / 60000;

    if (gapMin > 30) {
      spans.push({
        status: 'busy',
        label: '忙碌',
        timeRange: `${formatTime(sorted[i].timestamp)} - ${formatTime(sorted[i - 1].timestamp)}`,
      });
    } else {
      spans.push({
        status: 'online',
        label: '在线',
        timeRange: `${formatTime(sorted[i].timestamp)} - ${formatTime(sorted[i - 1].timestamp)}`,
      });
    }
    prevTime = curTime;
  }

  return spans.slice(0, 6);
}

function SkeletonDetail() {
  return (
    <div className="agent-detail">
      <div className="detail-back">
        <Link to="/">← 返回团队总览</Link>
      </div>
      <div className="detail-hero">
        <div className="detail-avatar-wrapper">
          <div className="skeleton detail-avatar-lg" style={{ width: 80, height: 80, borderRadius: '50%' }} />
        </div>
        <div className="detail-hero-info">
          <div className="skeleton" style={{ width: 180, height: 24, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 12 }} />
        </div>
      </div>
      <div className="detail-section">
        <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 16 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ width: '100%', height: 48, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="agent-detail">
      <div className="detail-back">
        <Link to="/">← 返回团队总览</Link>
      </div>
      <div className="detail-not-found">
        <div className="detail-not-found-icon">🔍</div>
        <h2>Agent 未找到</h2>
        <p>该 Agent 不存在或已被移除</p>
      </div>
    </div>
  );
}

export function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [agents, acts] = await Promise.all([
        fetchAgents(),
        fetchActivity(id),
      ]);
      const found = agents.find((a) => a.id === id);
      if (!found) {
        setNotFound(true);
      } else {
        setAgent(found);
        setActivities(acts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const recentActivities = useMemo(
    () => activities.slice(0, 20),
    [activities]
  );

  const statusHistory = useMemo(
    () => (agent ? inferStatusHistory(activities, agent) : []),
    [activities, agent]
  );

  if (loading) return <SkeletonDetail />;
  if (notFound) return <NotFound />;
  if (error) return (
    <div className="agent-detail">
      <div className="detail-back">
        <Link to="/">← 返回团队总览</Link>
      </div>
      <div className="error-msg">{error}</div>
    </div>
  );
  if (!agent) return null;

  return (
    <div className="agent-detail">
      <div className="detail-back">
        <Link to="/">← 返回团队总览</Link>
      </div>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-avatar-wrapper">
          <div
            className={`detail-avatar-lg ${agent.status} ${agent.uninitialized ? 'uninitialized' : ''}`}
            style={agent.uninitialized ? { background: generateGradientColor(agent.id) } : {}}
          >
            {getAvatarInitials(agent)}
          </div>
        </div>
        <div className="detail-hero-info">
          <div className="detail-hero-name">
            <h1>{getDisplayName(agent)}</h1>
            {agent.uninitialized && (
              <span className="uninitialized-badge">未配置</span>
            )}
            <span className={`status-badge ${agent.status}`}>
              <span className="dot" />
              {STATUS_LABELS[agent.status]}
            </span>
          </div>
          <p className={`detail-role ${agent.uninitialized ? 'role--uninitialized' : ''}`}>
            {agent.uninitialized ? '尚未配置 IDENTITY.md' : agent.role}
          </p>
          {agent.uninitialized && (
            <div className="uninitialized-hint">
              <p>该 Agent 尚未配置 IDENTITY.md 文件，无法显示完整信息。</p>
              <p className="hint-secondary">配置后将显示角色描述、活动统计等详细信息。</p>
            </div>
          )}
          <div className="detail-meta">
            <span>最后活跃：{timeAgo(agent.lastSeen)}</span>
            {agent.issueCount !== undefined && agent.issueCount > 0 && (
              <>
                <span className="detail-meta-sep">·</span>
                <span className="detail-issue-count">{agent.issueCount} 个 open issues</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      {activities.length > 0 && (
        <div className="detail-section">
          <ActivityChart activities={activities} />
        </div>
      )}

      {/* Recent Activity */}
      <div className="detail-section">
        <h2 className="section-title">最近活动</h2>
        {recentActivities.length === 0 ? (
          <div className="empty-state">暂无最近活动</div>
        ) : (
          <div className="detail-activity-list">
            {recentActivities.map((a, i) => {
              const showDate = i === 0 ||
                formatDateGroup(a.timestamp) !== formatDateGroup(recentActivities[i - 1].timestamp);
              return (
                <StaggerIn key={a.id} delay={i * 50}>
                  {showDate && (
                    <div className="detail-date-group">{formatDateGroup(a.timestamp)}</div>
                  )}
                  <div className="detail-activity-item">
                    <div className={`detail-activity-node ${ACTION_NODES[a.action] || 'node-work'}`}>
                      <span>{ACTION_ICONS[a.action] || '⚙️'}</span>
                    </div>
                    <span className="detail-activity-time">{formatTime(a.timestamp)}</span>
                    <span className={`activity-action ${ACTION_CLASSES[a.action] || ''}`}>
                      {a.action}
                    </span>
                    <span className="detail-activity-detail">{a.detail}</span>
                  </div>
                </StaggerIn>
              );
            })}
          </div>
        )}
      </div>

      {/* Uninitialized Hint */}
      {agent.uninitialized && (
        <div className="detail-section uninitialized-hint">
          <div className="hint-icon">⚠️</div>
          <p>
            <strong>{agent.id}</strong> 尚未配置 IDENTITY.md
          </p>
          <p className="hint-secondary">
            该 Agent 暂无法显示完整信息，配置后将显示角色描述。
          </p>
        </div>
      )}

      {/* Status History */}
      {statusHistory.length > 0 && (
        <div className="detail-section">
          <h2 className="section-title">状态历史</h2>
          <div className="detail-status-history">
            {statusHistory.map((s, i) => (
              <div key={i} className="detail-status-item">
                <span className="detail-status-icon">{STATUS_ICONS[s.status]}</span>
                <span className="detail-status-label">{s.label}</span>
                <span className="detail-status-range">{s.timeRange}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
