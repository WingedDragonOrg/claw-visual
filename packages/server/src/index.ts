import http from 'node:http';
import { URL } from 'node:url';
import cors from 'cors';
import type { Agent, DashboardData } from './types.js';
import { getMockAgents, getMockActivities, getMockActivitiesForAgent } from './mock-data.js';
import { fetchSessionsFromGateway } from './openclaw.js';

const PORT = Number(process.env.PORT) || 3200;
const POLL_INTERVAL = 30_000;

let cachedAgents: Agent[] = getMockAgents();
let useGateway = false;

async function pollGateway() {
  const agents = await fetchSessionsFromGateway();
  if (agents && agents.length > 0) {
    cachedAgents = agents;
    useGateway = true;
  } else {
    if (!useGateway) cachedAgents = getMockAgents();
  }
}

// Initial poll + interval
pollGateway();
setInterval(pollGateway, POLL_INTERVAL);

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Simple CORS middleware wrapper
const corsMiddleware = cors({ origin: true });

const server = http.createServer((req, res) => {
  corsMiddleware(req as any, res as any, () => {
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
      const activities = getMockActivitiesForAgent(agentId);
      return json(res, activities);
    }

    // GET /api/dashboard
    if (path === '/api/dashboard' && req.method === 'GET') {
      const dashboard: DashboardData = {
        totalAgents: cachedAgents.length,
        online: cachedAgents.filter(a => a.status === 'online').length,
        away: cachedAgents.filter(a => a.status === 'away').length,
        busy: cachedAgents.filter(a => a.status === 'busy').length,
        error: cachedAgents.filter(a => a.status === 'error').length,
        offline: cachedAgents.filter(a => a.status === 'offline').length,
        recentActivities: getMockActivities().slice(0, 10),
        lastUpdated: new Date().toISOString(),
      };
      return json(res, dashboard);
    }

    // Health check
    if (path === '/api/health') {
      return json(res, { status: 'ok', gateway: useGateway });
    }

    json(res, { error: 'Not found' }, 404);
  });
});

server.listen(PORT, () => {
  console.log(`[claw-visual] Server running at http://localhost:${PORT}`);
  console.log(`[claw-visual] Gateway polling: ${process.env.OPENCLAW_GATEWAY_TOKEN ? 'enabled' : 'disabled (no token, using mock data)'}`);
});
