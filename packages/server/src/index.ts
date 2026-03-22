import { serve } from '@hono/node-server';
import { WebSocketServer, type WebSocket as WsType } from 'ws';
import { createApp, createDefaultState, type AppState } from './app.js';
import { wsClients } from './app.js';
import type { Agent, Activity, GitHubSummary, Channel } from './types.js';
import { getMockAgents, getMockActivities } from './mock-data.js';
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
  lastNotifiedAt: Record<string, number>;
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
    const wasOnline = prev?.status === 'online' || prev?.status === 'busy';

    if (!prev) {
      agentStateMap.set(agent.id, {
        status: agent.status,
        offlineSince: isOnline ? null : now,
        lastNotifiedAt: {},
      });
      continue;
    }

    if (wasOnline && !isOnline) {
      prev.offlineSince = now;
    }

    if (!wasOnline && isOnline) {
      if (shouldNotify(prev, 'back')) {
        prev.lastNotifiedAt['back'] = now;
        notifyAgentBack(agent);
      }
      prev.offlineSince = null;
    }

    if (!isOnline && prev.offlineSince && now - prev.offlineSince >= DEBOUNCE_MS) {
      if (shouldNotify(prev, 'offline')) {
        prev.lastNotifiedAt['offline'] = now;
        notifyAgentOffline(agent);
      }
    }

    if (agent.heartbeatFailures >= 3) {
      if (shouldNotify(prev, 'heartbeat')) {
        prev.lastNotifiedAt['heartbeat'] = now;
        notifyHeartbeatFailure(agent);
      }
    }

    prev.status = agent.status;
  }
}

// State management
const state = createDefaultState();

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
      state.agents = agents;
      state.activities = activities;
      state.gitHub = github;
      const onlineIds = new Set(agents.filter(a => a.status === 'online' || a.status === 'busy').map(a => a.id));
      state.channels = await fetchChannels(onlineIds);
      state.useRealData = true;
      checkAgentStatusChanges(agents);

      // Broadcast updates to WebSocket clients
      broadcast('agent-update', { agents: state.agents });
      broadcast('activity-new', { activities: state.activities.slice(0, 20) });
      broadcast('github-refresh', state.gitHub);
      broadcast('channel-update', { channels: state.channels });
    }
  } catch (e) {
    console.error('[claw-visual] Error polling data:', e);
  }
  state.lastPollMs = Date.now() - pollStart;
}

// Start polling
pollData();
setInterval(pollData, POLL_INTERVAL);

// Create and start server
const { app, broadcast } = createApp(state) as any;
const server = serve({
  fetch: app.fetch,
  port: PORT,
});

// ── Native WebSocket server (replaces @hono/node-ws for Bun compatibility) ──
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`[ws] client connected, total: ${wsClients.size}`);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      } else if (msg.type === 'pong') {
        // Client responded to heartbeat:ping, connection is alive
      }
    } catch {
      // Ignore invalid messages
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[ws] client disconnected, total: ${wsClients.size}`);
  });
});

// Handle HTTP upgrade requests for /ws path
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Heartbeat: ping all clients every 30s
setInterval(() => {
  broadcast('heartbeat:ping', { timestamp: Date.now() });
}, 30_000);

console.log(`[claw-visual] Server running at http://localhost:${PORT}`);
console.log(`[claw-visual] data source: reading from ${process.env.AGENTS_DIR || '/home/ubuntu/.openclaw/agents'}`);
