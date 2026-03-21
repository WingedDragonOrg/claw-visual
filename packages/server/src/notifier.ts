import type { Agent } from './types.js';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const NOTIFY_ENABLED = process.env.NOTIFY_ENABLED !== 'false';

const Colors = {
  RED: 0xff0000,
  GREEN: 0x00ff00,
  YELLOW: 0xffaa00,
} as const;

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
  timestamp: string;
}

async function sendWebhook(embeds: DiscordEmbed[]): Promise<void> {
  if (!NOTIFY_ENABLED || !WEBHOOK_URL) return;

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds }),
    });
    if (!res.ok) {
      console.error(`[notifier] Discord webhook failed: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error('[notifier] Discord webhook error:', e);
  }
}

export async function notifyAgentOffline(agent: Agent): Promise<void> {
  await sendWebhook([{
    title: 'Agent Offline',
    description: `**${agent.name}** has been offline for over 10 minutes.`,
    color: Colors.RED,
    fields: [
      { name: 'Agent', value: agent.name, inline: true },
      { name: 'Role', value: agent.role, inline: true },
      { name: 'Last Seen', value: agent.lastSeen || 'Unknown', inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyHeartbeatFailure(agent: Agent): Promise<void> {
  await sendWebhook([{
    title: 'Heartbeat Failure',
    description: `**${agent.name}** heartbeat has failed ${agent.heartbeatFailures} consecutive times.`,
    color: Colors.YELLOW,
    fields: [
      { name: 'Agent', value: agent.name, inline: true },
      { name: 'Role', value: agent.role, inline: true },
      { name: 'Failures', value: String(agent.heartbeatFailures), inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyAgentBack(agent: Agent): Promise<void> {
  await sendWebhook([{
    title: 'Agent Back Online',
    description: `**${agent.name}** has recovered and is back online.`,
    color: Colors.GREEN,
    fields: [
      { name: 'Agent', value: agent.name, inline: true },
      { name: 'Role', value: agent.role, inline: true },
      { name: 'Status', value: agent.status, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}
