import { serve } from '@hono/node-server';
import { createApp, createDefaultState, type AppState } from './app.js';
import type { Agent, Activity, GitHubSummary, channel } from './types.js';
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
const { app, injectWebSocket } = createApp(state) as any;
const server = serve({
  fetch: app.fetch,
  port: PORT,
});

// Inject WebSocket after server starts
injectWebSocket(server);

console.log(`[claw-visual] Server running at http://localhost:${PORT}`);
console.log(`[claw-visual] data source: reading from ${process.env.AGENTS_DIR || '/home/ubuntu/.openclaw/agents'}`);
