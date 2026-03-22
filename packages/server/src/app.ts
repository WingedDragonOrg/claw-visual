import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { createNodeWebSocket } from '@hono/node-ws';
import type { Agent, DashboardData, Activity, GitHubSummary, Channel } from './types.js';
import { getMockAgents, getMockActivities, getMockActivitiesForAgent } from './mock-data.js';

export interface AppState {
  agents: Agent[];
  activities: Activity[];
  gitHub: GitHubSummary;
  channels: Channel[];
  useRealData: boolean;
  lastPollMs: number;
  startTime: number;
}

export function createDefaultState(): AppState {
  return {
    agents: getMockAgents(),
    activities: getMockActivities(),
    gitHub: { open: 0, closed: 0, avgCloseTimeHours: 0, byAssignee: {}, issues: [] },
    channels: [],
    useRealData: false,
    lastPollMs: 0,
    startTime: Date.now(),
  };
}

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3200'];

// WebSocket clients storage
const wsClients = new Set<any>();

export function createApp(state: AppState = createDefaultState()) {
  const app = new Hono();

  // CORS middleware
  app.use('*', cors({ origin: CORS_ORIGINS }));

  // Logger middleware
  app.use('*', logger());

  // ── API Routes ─────────────────────────────────────────────────────────

  // GET /api/agents
  app.get('/api/agents', (c) => {
    return c.json(state.agents);
  });

  // GET /api/agents/:id/activity
  app.get('/api/agents/:id/activity', (c) => {
    const agentId = c.req.param('id');
    const activities = state.useRealData
      ? state.activities.filter(a => a.agentId === agentId)
      : getMockActivitiesForAgent(agentId);
    return c.json(activities);
  });

  // GET /api/channels
  app.get('/api/channels', (c) => {
    return c.json(state.channels);
  });

  // GET /api/channels/:id/agents
  app.get('/api/channels/:id/agents', (c) => {
    const channelId = c.req.param('id');
    const channel = state.channels.find(ch => ch.id === channelId);
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404);
    }
    const agents = state.agents.filter(a => channel.agentIds.includes(a.id));
    return c.json(agents);
  });

  // GET /api/dashboard
  app.get('/api/dashboard', (c) => {
    const activeChannels = state.channels.filter(ch => ch.onlineCount > 0).length;
    const dashboard: DashboardData = {
      totalAgents: state.agents.length,
      online: state.agents.filter(a => a.status === 'online').length,
      away: state.agents.filter(a => a.status === 'away').length,
      busy: state.agents.filter(a => a.status === 'busy').length,
      error: state.agents.filter(a => a.status === 'error').length,
      offline: state.agents.filter(a => a.status === 'offline').length,
      openIssues: state.gitHub.open,
      channels: state.channels,
      activeChannels,
      recentActivities: state.activities.slice(0, 20),
      lastUpdated: new Date().toISOString(),
    };
    return c.json(dashboard);
  });

  // GET /api/issues
  app.get('/api/issues', (c) => {
    return c.json(state.gitHub);
  });

  // GET /api/config/thresholds
  app.get('/api/config/thresholds', (c) => {
    const hour = new Date().getHours();
    const isNightMode = hour >= 23 || hour < 8;
    return c.json({
      isNightMode,
      normal: { onlineMinutes: 5, busyMinutes: 30, awayMinutes: 90 },
      night: { onlineMinutes: 10, busyMinutes: 60, awayMinutes: 180 },
      current: isNightMode
        ? { onlineMinutes: 10, busyMinutes: 60, awayMinutes: 180 }
        : { onlineMinutes: 5, busyMinutes: 30, awayMinutes: 90 },
      heartbeatFailuresForError: 2,
    });
  });

  // GET /api/health
  app.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      dataSource: state.useRealData ? 'openclaw-files' : 'mock',
      agentsCount: state.agents.length,
      channelsCount: state.channels.length,
      lastPollMs: state.lastPollMs,
      uptime: Math.round((Date.now() - state.startTime) / 1000),
      wsClients: wsClients.size,
    });
  });

  // ── WebSocket ─────────────────────────────────────────────────────────
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  app.get('/ws', upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      wsClients.add(ws);
      console.log(`[ws] client connected, total: ${wsClients.size}`);
    },
    onMessage(event, ws) {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        } else if (msg.type === 'pong') {
          // Client responded to heartbeat:ping, connection is alive
        }
      } catch {
        // Ignore invalid messages
      }
    },
    onClose(_event, ws) {
      wsClients.delete(ws);
      console.log(`[ws] client disconnected, total: ${wsClients.size}`);
    },
  })));

  // Broadcast to all WebSocket clients
  function broadcast(type: string, data: any) {
    const msg = JSON.stringify({ type, data, timestamp: Date.now() });
    wsClients.forEach(ws => {
      try {
        ws.send(msg);
      } catch {
        // Client might be disconnected
      }
    });
  }

  // ── 404 for unknown API routes (must come before static files) ───────────────
  app.all('/api/*', (c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  // ── Static Files & SPA Fallback ─────────────────────────────────────────────
  // Serve static files from packages/web/dist
  app.use('/*', serveStatic({ root: '../web/dist' }));

  // SPA fallback - serve index.html for non-API routes
  app.use('*', serveStatic({ path: '../web/dist/index.html' }));

  return { app, injectWebSocket, broadcast };
}
