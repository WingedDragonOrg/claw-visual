import { useEffect, useState } from 'react';
import { fetchThresholds, type ThresholdData } from '../api';
import type { AgentStatus } from '../types';
import { Tooltip } from './Tooltip';

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

function buildTooltipContent(status: AgentStatus, t: ThresholdData) {
  const { current, isNightMode, heartbeatFailuresForError } = t;

  let desc = '';
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

// Singleton cache — thresholds only change every 30min at most
let cachedThresholds: ThresholdData | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getThresholds(): Promise<ThresholdData | null> {
  const now = Date.now();
  if (cachedThresholds && now - lastFetchTime < CACHE_TTL) return cachedThresholds;
  try {
    const data = await fetchThresholds();
    cachedThresholds = data;
    lastFetchTime = now;
    return data;
  } catch {
    return cachedThresholds; // return stale on error
  }
}

interface StatusBadgeProps {
  status: AgentStatus;
}

/**
 * Status badge with hover tooltip showing threshold definition.
 * Tooltip content is dynamically fetched and cached.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const [thresholds, setThresholds] = useState<ThresholdData | null>(cachedThresholds);

  useEffect(() => {
    if (!thresholds) {
      getThresholds().then(setThresholds);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const badge = (
    <span className={`status-badge ${status}`}>
      <span className="dot" />
      {STATUS_LABELS[status]}
    </span>
  );

  if (!thresholds) return badge;

  return (
    <Tooltip content={buildTooltipContent(status, thresholds)}>
      {badge}
    </Tooltip>
  );
}
