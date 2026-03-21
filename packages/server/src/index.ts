import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { URL } from 'node:url';
import cors from 'cors';
import type { Agent, DashboardData, Activity, GitHubSummary, Channel } from './types.js';
import { getMockAgents, getMockActivities, getMockActivitiesForAgent } from './mock-data.js';
import { fetchAgentsAndActivities } from './openclaw.js';
import { fetchGitHubIssues, getIssueCountForAgent } from './github.js';
import { fetchChannels } from './channels.js';
import { notifyAgentOffline, notifyHeartbeatFailure, notifyAgentBack } from './notifier.js';

const PORT = Number(process.env.PORT) || 3200;
const POLL_INTERVAL = 30_000;
const DEBOUNCE_MS = 10 * 60 * 1000; // 10 minutes

interface AgentTrackingState {
  status: Agent['status'];
  offlineSince: number | null;
  lastNotifiedAt: Record<string, number>; // notification type -> timestamp
}

const agentStateMap = new Map<string, AgentTrackingState>();

function shouldNotify(state: AgentTrackingState, type: string): boolean {
  const last = state.lastNotifiedAt[type] || 0;
  return Date.now() - last >= DEBOUNCE_MS;
}

async function checkAgentStatusChanges(newAgents: Agent[]) {
  const now = Date.now();

  for (const agent of newAgents) {
    const prev = agentStateMap.get(agent.id);
    const isOnline = agent.status === 'online' || agent.status === 'busy';

    if (!prev) {
      agentStateMap.set(agent.id, {
        status: agent.status,
        offlineSince: isOnline ? null : now,
        lastNotifiedAt: {},
      });
      continue;
    }

    const wasOnline = prev.status === 'online' || prev.status === 'busy';

    // Agent went offline
    if (wasOnline && !isOnline) {
      prev.offlineSince = now;
    }

    // Agent back online from offline/error
    if (!wasOnline && isOnline) {
      if (shouldNotify(prev, 'back')) {
        prev.lastNotifiedAt['back'] = now;
        notifyAgentBack(agent);
      }
      prev.offlineSince = null;
    }

    // Offline for over 10 minutes
    if (!isOnline && prev.offlineSince && now - prev.offlineSince >= DEBOUNCE_MS) {
      if (shouldNotify(prev, 'offline')) {
        prev.lastNotifiedAt['offline'] = now;
        notifyAgentOffline(agent);
      }
    }

    // Heartbeat failures >= 3
    if (agent.heartbeatFailures >= 3) {
      if (shouldNotify(prev, 'heartbeat')) {
        prev.lastNotifiedAt['heartbeat'] = now;
        notifyHeartbeatFailure(agent);
      }
    }

    prev.status = agent.status;
  }
}

let cachedAgents: Agent[] = getMockAgents();
let cachedActivities: Activity[] = getMockActivities();
let cachedGitHub: GitHubSummary = { open: 0, closed: 0, avgCloseTimeHours: 0, byAssignee: {}, issues: [] };
let cachedChannels: Channel[] = [];
let useRealData = false;
let lastPollMs = 0;
const startTime = Date.now();

async function pollData() {
  const pollStart = Date.now();
  try {
    const [{ agents, activities }, github] = await Promise.all([
      fetchAgentsAndActivities(),
      fetchGitHubIssues(),
    ]);

    if (agents && agents.length > 0) {
      for (const agent of agents) {
        agent.issueCount = getIssueCountForAgent(github.byAssignee, agent.id);
      }
      cachedAgents = agents;
      cachedActivities = activities;
      cachedGitHub = github;
      const onlineIds = new Set(agents.filter(a => a.status === 'online' || a.status === 'busy').map(a => a.id));
      cachedChannels = await fetchChannels(onlineIds);
      useRealData = true;
      checkAgentStatusChanges(agents);
    }
  } catch (e) {
    console.error('[claw-visual] Error polling data:', e);
  }
  lastPollMs = Date.now() - pollStart;
}

// Initial poll + interval
pollData();
setInterval(pollData, POLL_INTERVAL);

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3200'];
const corsMiddleware = cors({ origin: CORS_ORIGINS });

const server = http.createServer((req, res) => {
  corsMiddleware(req as any, res as any, async () => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const path = url.pathname;

    // GET /api/agents
    if (path === '/api/agents' && req.method === 'GET') {
      return json(res, cachedAgents);
    }

    // GET /api/agents/:id/activity
    const activityMatch = path.match(/^\/api\/agents\/([^/]+)\/activity$/);
    if (activityMatch && req.method === 'GET') {
      const agentId = activityMatch[1];
      const activities = useRealData
        ? cachedActivities.filter(a => a.agentId === agentId)
        : getMockActivitiesForAgent(agentId);
      return json(res, activities);
    }

    // GET /api/channels
    if (path === '/api/channels' && req.method === 'GET') {
      return json(res, cachedChannels);
    }

    // GET /api/channels/:id/agents
    const channelAgentsMatch = path.match(/^\/api\/channels\/([^/]+)\/agents$/);
    if (channelAgentsMatch && req.method === 'GET') {
      const channelId = channelAgentsMatch[1];
      const channel = cachedChannels.find(c => c.id === channelId);
      if (!channel) return json(res, { error: 'Channel not found' }, 404);
      const agents = cachedAgents.filter(a => channel.agentIds.includes(a.id));
      return json(res, agents);
    }

    // GET /api/dashboard
    if (path === '/api/dashboard' && req.method === 'GET') {
      const activeChannels = cachedChannels.filter(c => c.onlineCount > 0).length;
      const dashboard: DashboardData = {
        totalAgents: cachedAgents.length,
        online: cachedAgents.filter(a => a.status === 'online').length,
        away: cachedAgents.filter(a => a.status === 'away').length,
        busy: cachedAgents.filter(a => a.status === 'busy').length,
        error: cachedAgents.filter(a => a.status === 'error').length,
        offline: cachedAgents.filter(a => a.status === 'offline').length,
        openIssues: cachedGitHub.open,
        channels: cachedChannels,
        activeChannels,
        recentActivities: cachedActivities.slice(0, 20),
        lastUpdated: new Date().toISOString(),
      };
      return json(res, dashboard);
    }

    // GET /api/issues
    if (path === '/api/issues' && req.method === 'GET') {
      return json(res, cachedGitHub);
    }

    // GET /api/config/thresholds — expose status threshold constants for frontend
    if (path === '/api/config/thresholds' && req.method === 'GET') {
      const hour = new Date().getHours();
      const isNightMode = hour >= 23 || hour < 8;
      return json(res, {
        isNightMode,
        normal: { onlineMinutes: 5, busyMinutes: 30, awayMinutes: 90 },
        night:  { onlineMinutes: 10, busyMinutes: 60, awayMinutes: 180 },
        current: isNightMode
          ? { onlineMinutes: 10, busyMinutes: 60, awayMinutes: 180 }
          : { onlineMinutes: 5, busyMinutes: 30, awayMinutes: 90 },
        heartbeatFailuresForError: 2,
      });
    }

    // Health check
    if (path === '/api/health') {
      return json(res, {
        status: 'ok',
        dataSource: useRealData ? 'openclaw-files' : 'mock',
        agentsCount: cachedAgents.length,
        channelsCount: cachedChannels.length,
        lastPollMs,
        uptime: Math.round((Date.now() - startTime) / 1000),
      });
    }

    // 静态文件服务：serve packages/web/dist
    const WEB_DIR = join(import.meta.dirname, '../../web/dist');
    const filePath = join(WEB_DIR, path === '/' ? '/index.html' : path);

    // 防止路径遍历
    if (!filePath.startsWith(WEB_DIR)) {
      return json(res, { error: 'Forbidden' }, 403);
    }

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        const ext = extname(filePath);
        const contentTypes: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';
        const content = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(content);
      }
    } catch {
      // 文件不存在，fall through
    }

    // SPA fallback：非 API 且非静态文件的请求返回 index.html
    if (!path.startsWith('/api/')) {
      try {
        const indexPath = join(WEB_DIR, 'index.html');
        const content = await readFile(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(content);
      } catch {
        // index.html 不存在
      }
    }

    json(res, { error: 'Not found' }, 404);
  });
});

server.listen(PORT, () => {
  console.log(`[claw-visual] Server running at http://localhost:${PORT}`);
  console.log(`[claw-visual] Data source: reading from ${process.env.AGENTS_DIR || '/home/ubuntu/.openclaw/agents'}`);
});
