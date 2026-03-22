import { useState, useEffect, useCallback, useRef } from 'react';

interface WSMessage {
  type: string;
  data: any;
  timestamp: number;
}

type WSDataHandler = (data: any) => void;

interface UseRealtimeDataOptions {
  /** Called when agent list is updated via WebSocket */
  onAgentUpdate?: WSDataHandler;
  /** Called when a new activity arrives via WebSocket */
  onActivityNew?: WSDataHandler;
  /** Called when GitHub data is refreshed via WebSocket */
  onGitHubRefresh?: WSDataHandler;
  /** Called when channel data is updated via WebSocket */
  onChannelUpdate?: WSDataHandler;
}

const HEARTBEAT_INTERVAL_MS = 25_000; // client ping every 25s
const HEARTBEAT_TIMEOUT_MS = 35_000;  // expect pong within 35s
const MAX_RETRY_DELAY_MS = 30_000;    // max backoff 30s
const RETRY_SETTLE_TIME_MS = 60_000;  // after max retries, retry every 60s

function getBackoffDelay(attempt: number): number {
  if (attempt > 5) return MAX_RETRY_DELAY_MS;
  return Math.min(1000 * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS);
}

export function useRealtimeData<T>(
  fetcher: () => Promise<T>,
  wsUrl: string | null = null,
  intervalMs = 30_000,
  options: UseRealtimeDataOptions = {}
) {
  const { onAgentUpdate, onActivityNew, onGitHubRefresh, onChannelUpdate } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const retryAttempt = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isUnmountRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  const clearTimers = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (heartbeatTimeoutTimer.current) {
      clearTimeout(heartbeatTimeoutTimer.current);
      heartbeatTimeoutTimer.current = null;
    }
  }, []);

  const resetRetryState = useCallback(() => {
    retryAttempt.current = 0;
  }, []);

  const scheduleRetry = useCallback((fn: () => void) => {
    if (isUnmountRef.current) return;
    clearTimers();
    const delay = getBackoffDelay(retryAttempt.current + 1);
    retryAttempt.current += 1;
    console.log(`[ws] retry in ${delay}ms (attempt ${retryAttempt.current})`);
    retryTimer.current = setTimeout(fn, delay);
  }, [clearTimers]);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      // Set timeout to expect pong
      heartbeatTimeoutTimer.current = setTimeout(() => {
        console.warn('[ws] pong timeout, reconnecting');
        wsRef.current?.close();
      }, HEARTBEAT_TIMEOUT_MS);
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimers();
    heartbeatTimer.current = setInterval(sendPing, HEARTBEAT_INTERVAL_MS);
    // Send first ping after a short delay to allow connection to establish
    setTimeout(sendPing, 2000);
  }, [clearTimers, sendPing]);

  const connectWs = useCallback(() => {
    if (!wsUrl || isUnmountRef.current) return;
    clearTimers();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountRef.current) { ws.close(); return; }
        setWsConnected(true);
        resetRetryState();
        startHeartbeat();
        console.log('[ws] connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          switch (msg.type) {
            case 'agent-update':
              setData((prev: any) => ({
                ...prev,
                ...msg.data,
              }));
              onAgentUpdate?.(msg.data);
              setError(null);
              break;
            case 'activity-new':
              onActivityNew?.(msg.data);
              break;
            case 'github-refresh':
              onGitHubRefresh?.(msg.data);
              break;
            case 'channel-update':
              onChannelUpdate?.(msg.data);
              break;
            case 'pong':
              // Clear pong timeout on response
              if (heartbeatTimeoutTimer.current) {
                clearTimeout(heartbeatTimeoutTimer.current);
                heartbeatTimeoutTimer.current = null;
              }
              break;
            case 'heartbeat:ping':
              // Respond to server heartbeat
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              }
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (isUnmountRef.current) return;
        setWsConnected(false);
        clearTimers();
        console.log('[ws] disconnected');
        scheduleRetry(connectWs);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setWsConnected(false);
      scheduleRetry(connectWs);
    }
  }, [wsUrl, clearTimers, scheduleRetry, startHeartbeat, resetRetryState, onAgentUpdate, onActivityNew, onGitHubRefresh, onChannelUpdate]);

  useEffect(() => {
    isUnmountRef.current = false;
    if (!wsUrl || typeof WebSocket === 'undefined') {
      poll();
      const id = setInterval(poll, intervalMs);
      return () => {
        isUnmountRef.current = true;
        clearInterval(id);
      };
    }

    poll();
    connectWs();

    const pollInterval = setInterval(() => {
      if (!wsConnected) poll();
    }, intervalMs);

    return () => {
      isUnmountRef.current = true;
      clearTimers();
      if (wsRef.current) wsRef.current.close();
      clearInterval(pollInterval);
    };
  }, [wsUrl, intervalMs, poll, connectWs, clearTimers, wsConnected]);

  const refresh = useCallback(() => poll(), [poll]);

  return { data, error, loading, refresh, wsConnected };
}
