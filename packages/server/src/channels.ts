import type { Channel } from './types.js';
import { readdir, stat, open } from 'node:fs/promises';
import { join } from 'node:path';

const AGENTS_DIR = process.env.AGENTS_DIR || '/home/ubuntu/.openclaw/agents';

// Pattern: Guild #频道名 channel id:1234567890 (supports Chinese channel names)
// Discord snowflake IDs are 17-20 digits
const DISCORD_CHANNEL_RE = /Guild #(.+?) channel id:(\d{17,20})/g;

const TAIL_BYTES = 8192; // 8KB — same as openclaw.ts

interface ChannelRecord {
  id: string;
  name: string;
  type: Channel['type'];
  agentIds: Set<string>;
  lastTimestamp: number;
}

/**
 * Read only the tail of a file and parse JSONL lines containing channel refs.
 * Reuses the same tail-reading strategy as openclaw.ts parseLastLines.
 */
async function scanFileForChannels(
  filePath: string,
  channelMap: Map<string, ChannelRecord>,
  agentId: string,
): Promise<void> {
  let fh;
  try {
    fh = await open(filePath, 'r');
  } catch {
    return;
  }

  try {
    const fileStats = await fh.stat();
    const fileSize = fileStats.size;

    let content: string;
    if (fileSize <= TAIL_BYTES) {
      const buf = Buffer.alloc(fileSize);
      await fh.read(buf, 0, fileSize, 0);
      content = buf.toString('utf-8');
    } else {
      const buf = Buffer.alloc(TAIL_BYTES);
      await fh.read(buf, 0, TAIL_BYTES, fileSize - TAIL_BYTES);
      const raw = buf.toString('utf-8');
      const firstNewline = raw.indexOf('\n');
      content = firstNewline >= 0 ? raw.slice(firstNewline + 1) : raw;
    }

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
      let match: RegExpExecArray | null;
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
  } finally {
    await fh.close();
  }
}

/**
 * Scan all agent session JSONL files and extract channel information.
 * Now fully async — reads only the last 8KB of each file instead of full content.
 */
export async function fetchChannels(onlineAgentIds: Set<string>): Promise<Channel[]> {
  const channelMap = new Map<string, ChannelRecord>();
  let agentIds: string[];

  try {
    const entries = await readdir(AGENTS_DIR);
    const checks = await Promise.all(
      entries.map(async (id) => {
        const sessionsDir = join(AGENTS_DIR, id, 'sessions');
        try {
          await stat(sessionsDir);
          return id;
        } catch {
          return null;
        }
      }),
    );
    agentIds = checks.filter((id): id is string => id !== null);
  } catch {
    return [];
  }

  // Collect all session files across all agents
  const fileTasks: { filePath: string; agentId: string }[] = [];

  const sessionLists = await Promise.all(
    agentIds.map(async (agentId) => {
      const sessionsDir = join(AGENTS_DIR, agentId, 'sessions');
      try {
        const files = await readdir(sessionsDir);
        return files
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => ({ filePath: join(sessionsDir, f), agentId }));
      } catch {
        return [];
      }
    }),
  );

  for (const list of sessionLists) {
    fileTasks.push(...list);
  }

  // Scan all files in parallel (each reads only tail 8KB)
  await Promise.all(
    fileTasks.map(({ filePath, agentId }) =>
      scanFileForChannels(filePath, channelMap, agentId),
    ),
  );

  // Convert to Channel[] sorted by lastActivity desc
  const channels: Channel[] = Array.from(channelMap.values())
    .map((rec) => {
      const agentIdArr = Array.from(rec.agentIds);
      return {
        id: rec.id,
        name: rec.name,
        type: rec.type,
        agentIds: agentIdArr,
        agentCount: agentIdArr.length,
        onlineCount: agentIdArr.filter((id) => onlineAgentIds.has(id)).length,
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
