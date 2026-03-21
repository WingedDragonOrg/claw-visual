import { useState, useEffect, useCallback, useRef } from 'react';

interface WSMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useRealtimeData<T>(
  fetcher: () => Promise<T>,
  wsUrl: string | null = null,
  intervalMs = 30_000,
  maxRetries = 5
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const retryCount = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Fallback polling
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

  // WebSocket connection
  useEffect(() => {
    if (!wsUrl || typeof WebSocket === 'undefined') {
      // No WebSocket support, use polling only
      poll();
      const id = setInterval(poll, intervalMs);
      return () => clearInterval(id);
    }

    let retryTimer: NodeJS.Timeout | null = null;

    const connectWs = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          retryCount.current = 0;
          console.log('[ws] connected');
        };

        ws.onmessage = (event) => {
          try {
            const msg: WSMessage = JSON.parse(event.data);
            if (msg.type === 'agent-update') {
              setData(msg.data);
              setError(null);
            } else if (msg.type === 'activity') {
              // Handle activity updates
              setData((prev: any) => ({
                ...prev,
                recentActivities: [msg.data, ...(prev?.recentActivities || [])].slice(0, 20),
              }));
            }
          } catch {
            // Ignore invalid messages
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          console.log('[ws] disconnected');
          
          // Retry logic
          if (retryCount.current < maxRetries) {
            retryCount.current++;
            retryTimer = setTimeout(() => {
              console.log(`[ws] retry ${retryCount.current}/${maxRetries}`);
              connectWs();
            }, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsConnected(false);
      }
    };

    // Initial poll + WebSocket connection
    poll();
    connectWs();

    // Fallback polling when WebSocket is not connected
    const pollInterval = setInterval(() => {
      if (!wsConnected) {
        poll();
      }
    }, intervalMs);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(pollInterval);
    };
  }, [wsUrl, intervalMs, maxRetries, poll, wsConnected]);

  const refresh = useCallback(() => {
    return poll();
  }, [poll]);

  return { data, error, loading, refresh, wsConnected };
}
