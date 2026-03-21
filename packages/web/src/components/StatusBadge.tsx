import type { AgentStatus } from '../types';
import { Tooltip } from './Tooltip';
import { useThresholds } from '../context/ThresholdsContext';
import type { ThresholdData } from '../api';

const STATUS_ICONS: Record<AgentStatus, string> = {
  online:  '🟢',
  busy:    '🟠',
  away:    '🟡',
  offline: '⚫',
  error:   '🔴',
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  online:  '在线',
  busy:    '忙碌中',
  away:    '离开',
  offline: '离线',
  error:   '异常',
};

// Static fallback descriptions — shown when thresholds haven't loaded or failed
const STATIC_DESCS: Record<AgentStatus, string> = {
  online:  '近期有响应',
  busy:    '短时间无响应',
  away:    '较长时间无响应',
  offline: '长时间无响应',
  error:   '心跳连续失败',
};

function buildTooltipContent(status: AgentStatus, t: ThresholdData | null) {
  let desc: string;

  if (t) {
    const { current, isNightMode, heartbeatFailuresForError } = t;
    switch (status) {
      case 'online':
        desc = `${current.onlineMinutes} 分钟内有响应`;
        break;
      case 'busy':
        desc = `${current.onlineMinutes}–${current.busyMinutes} 分钟无响应`;
        break;
      case 'away':
        desc = `${current.busyMinutes}–${current.awayMinutes} 分钟无响应`;
        break;
      case 'offline':
        desc = `${current.awayMinutes} 分钟以上无响应`;
        break;
      case 'error':
        desc = `心跳连续失败 ≥ ${heartbeatFailuresForError} 次`;
        break;
      default:
        desc = STATIC_DESCS[status];
    }
    return (
      <span>
        <span className="tooltip-status-title">{STATUS_ICONS[status]} {STATUS_LABELS[status]}</span>
        <br />
        <span className="tooltip-status-desc">{desc}</span>
        {isNightMode && (
          <>
            <br />
            <span className="tooltip-night-note">休眠时段阈值放宽</span>
          </>
        )}
      </span>
    );
  }

  // Fallback: thresholds not yet loaded or fetch failed
  return (
    <span>
      <span className="tooltip-status-title">{STATUS_ICONS[status]} {STATUS_LABELS[status]}</span>
      <br />
      <span className="tooltip-status-desc">{STATIC_DESCS[status]}</span>
    </span>
  );
}

interface StatusBadgeProps {
  status: AgentStatus;
}

/**
 * Status badge with hover tooltip.
 * Thresholds sourced from ThresholdsContext (single fetch, app-wide shared).
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { thresholds } = useThresholds();

  return (
    <Tooltip content={buildTooltipContent(status, thresholds)}>
      <span className={`status-badge ${status}`}>
        <span className="dot" />
        {STATUS_LABELS[status]}
      </span>
    </Tooltip>
  );
}
