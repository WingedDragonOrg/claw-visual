import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { URL } from 'node:url';
import cors from 'cors';
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

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3200'];

export function createApp(state: AppState = createDefaultState()): http.Server {
  const corsMiddleware = cors({ origin: CORS_ORIGINS });

  const server = http.createServer((req, res) => {
    corsMiddleware(req as any, res as any, async () => {
      const url = new URL(req.url || '/', 'http://localhost:3200');
      const path = url.pathname;

      // GET /api/agents
      if (path === '/api/agents' && req.method === 'GET') {
        return json(res, state.agents);
      }

      // GET /api/agents/:id/activity
      const activityMatch = path.match(/^\/api\/agents\/([^/]+)\/activity$/);
      if (activityMatch && req.method === 'GET') {
        const agentId = activityMatch[1];
        const activities = state.useRealData
          ? state.activities.filter(a => a.agentId === agentId)
          : getMockActivitiesForAgent(agentId);
        return json(res, activities);
      }

      // GET /api/channels
      if (path === '/api/channels' && req.method === 'GET') {
        return json(res, state.channels);
      }

      // GET /api/channels/:id/agents
      const channelAgentsMatch = path.match(/^\/api\/channels\/([^/]+)\/agents$/);
      if (channelAgentsMatch && req.method === 'GET') {
        const channelId = channelAgentsMatch[1];
        const channel = state.channels.find(c => c.id === channelId);
        if (!channel) return json(res, { error: 'Channel not found' }, 404);
        const agents = state.agents.filter(a => channel.agentIds.includes(a.id));
        return json(res, agents);
      }

      // GET /api/dashboard
      if (path === '/api/dashboard' && req.method === 'GET') {
        const activeChannels = state.channels.filter(c => c.onlineCount > 0).length;
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
        return json(res, dashboard);
      }

      // GET /api/issues
      if (path === '/api/issues' && req.method === 'GET') {
        return json(res, state.gitHub);
      }

      // GET /api/config/thresholds
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
          dataSource: state.useRealData ? 'openclaw-files' : 'mock',
          agentsCount: state.agents.length,
          channelsCount: state.channels.length,
          lastPollMs: state.lastPollMs,
          uptime: Math.round((Date.now() - state.startTime) / 1000),
        });
      }

      // 静态文件服务（测试时跳过）
      if (!path.startsWith('/api/')) {
        return json(res, { error: 'Static files not served in test mode' }, 404);
      }

      json(res, { error: 'Not found' }, 404);
    });
  });

  return server;
}
