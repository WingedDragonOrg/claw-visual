import type { Channel } from './types.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS_DIR = process.env.AGENTS_DIR || '/home/ubuntu/.openclaw/agents';

// Pattern: [Discord Guild #channelName channel id:1234567890]
const DISCORD_CHANNEL_RE = /\[Discord Guild #(\S+) channel id:(\d+)/g;

interface ChannelRecord {
  id: string;
  name: string;
  type: Channel['type'];
  agentIds: Set<string>;
  lastTimestamp: number;
}

/**
 * Scan all agent session JSONL files and extract channel information.
 */
export function fetchChannels(onlineAgentIds: Set<string>): Channel[] {
  const channelMap = new Map<string, ChannelRecord>();
  let agentIds: string[];

  try {
    agentIds = readdirSync(AGENTS_DIR).filter(id => {
      const sessionsDir = join(AGENTS_DIR, id, 'sessions');
      return existsSync(sessionsDir);
    });
  } catch {
    return [];
  }

  for (const agentId of agentIds) {
    const sessionsDir = join(AGENTS_DIR, agentId, 'sessions');
    let files: string[];
    try {
      files = readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = join(sessionsDir, file);
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      // Scan for Discord channel references
      let match: RegExpExecArray | null;
      DISCORD_CHANNEL_RE.lastIndex = 0;

      // Process line by line to associate timestamps
      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.includes('channel id:')) continue;

        // Extract timestamp from this JSONL entry
        let ts = 0;
        const tsMatch = line.match(/"timestamp"\s*:\s*"([^"]+)"/);
        if (tsMatch) {
          const d = new Date(tsMatch[1]).getTime();
          if (!isNaN(d)) ts = d;
        }

        DISCORD_CHANNEL_RE.lastIndex = 0;
        while ((match = DISCORD_CHANNEL_RE.exec(line)) !== null) {
          const channelName = match[1];
          const channelId = match[2];

          let rec = channelMap.get(channelId);
          if (!rec) {
            rec = {
              id: channelId,
              name: `#${channelName}`,
              type: 'discord',
              agentIds: new Set(),
              lastTimestamp: 0,
            };
            channelMap.set(channelId, rec);
          }

          rec.agentIds.add(agentId);
          if (ts > rec.lastTimestamp) rec.lastTimestamp = ts;
        }
      }
    }
  }

  // Convert to Channel[] sorted by lastActivity desc
  const channels: Channel[] = Array.from(channelMap.values())
    .map(rec => {
      const agentIdArr = Array.from(rec.agentIds);
      return {
        id: rec.id,
        name: rec.name,
        type: rec.type,
        agentIds: agentIdArr,
        agentCount: agentIdArr.length,
        onlineCount: agentIdArr.filter(id => onlineAgentIds.has(id)).length,
        lastActivity: rec.lastTimestamp ? new Date(rec.lastTimestamp).toISOString() : null,
      };
    })
    .sort((a, b) => {
      const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return tb - ta;
    });

  return channels;
}
