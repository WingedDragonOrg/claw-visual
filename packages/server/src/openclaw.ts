import type { Agent, Activity } from './types.js';
import { readFile, readdir, stat, access } from 'node:fs/promises';
import { open } from 'node:fs/promises';
import { join } from 'node:path';

const AGENTS_DIR = process.env.AGENTS_DIR || '/home/ubuntu/.openclaw/agents';
const WORKSPACES_DIR = process.env.WORKSPACES_DIR || '/home/ubuntu/.openclaw';

// Manual overrides: agent id → { name, role }
// These take precedence over auto-discovery
const AGENT_OVERRIDES: Record<string, { name: string; role?: string; avatar?: string }> = {};

interface AgentMeta {
  name: string;
  role: string;
  avatar: string;
}

// --- Agent metadata cache ---
const metaCache = new Map<string, { meta: AgentMeta; mtime: number }>();

// --- Directory scan cache ---
let dirScanCache: { ids: string[]; timestamp: number } | null = null;
const DIR_SCAN_TTL = 30_000; // 30 seconds

/**
 * Auto-discover all agents from the agents directory (cached for 30s)
 */
async function discoverAgentIds(): Promise<string[]> {
  const now = Date.now();
  if (dirScanCache && now - dirScanCache.timestamp < DIR_SCAN_TTL) {
    return dirScanCache.ids;
  }

  try {
    const entries = await readdir(AGENTS_DIR);
    const ids: string[] = [];
    for (const id of entries) {
      const sessionsDir = join(AGENTS_DIR, id, 'sessions');
      try {
        await access(sessionsDir);
        ids.push(id);
      } catch {
        // no sessions dir
      }
    }
    dirScanCache = { ids, timestamp: now };
    return ids;
  } catch {
    return [];
  }
}

// Detect unfilled template placeholders or boilerplate
function isPlaceholder(val: string): boolean {
  if (!val || val.trim() === '') return true;
  const lower = val.toLowerCase();
  return lower.includes('_(') || lower.includes('pick something')
    || lower.includes('soul.md') || lower.includes('identity.md')
    || lower.includes('who you are') || lower.includes('who am i')
    || lower.includes('我是谁') || lower.includes('not a chatbot')
    || lower.includes('becoming someone');
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract agent metadata from workspace IDENTITY.md / SOUL.md
 * Uses mtime-based caching to avoid re-reading unchanged files.
 */
async function extractAgentMeta(agentId: string): Promise<AgentMeta> {
  // Check override first
  const override = AGENT_OVERRIDES[agentId];
  if (override) {
    return {
      name: override.name,
      role: override.role || '',
      avatar: override.avatar || override.name.slice(0, 2),
    };
  }

  // Special case for main agent
  if (agentId === 'main') {
    return { name: '小爱同学', role: '私人助理', avatar: '小爱' };
  }

  // Check cache by mtime
  const workspaceDir = join(WORKSPACES_DIR, `clawd-${agentId}`);
  const identityPath = join(workspaceDir, 'IDENTITY.md');
  const soulPath = join(workspaceDir, 'SOUL.md');

  // Get max mtime of identity files for cache key
  let maxMtime = 0;
  try {
    const s = await stat(identityPath);
    maxMtime = Math.max(maxMtime, s.mtimeMs);
  } catch { /* file doesn't exist */ }
  try {
    const s = await stat(soulPath);
    maxMtime = Math.max(maxMtime, s.mtimeMs);
  } catch { /* file doesn't exist */ }

  const cached = metaCache.get(agentId);
  if (cached && cached.mtime === maxMtime && maxMtime > 0) {
    return cached.meta;
  }

  let name = '';
  let role = '';

  // Try IDENTITY.md
  if (await fileExists(identityPath)) {
    const content = await readFile(identityPath, 'utf-8');
    const nameMatch = content.match(/\*\*Name:\*\*\s*(.+)/);
    if (nameMatch && !isPlaceholder(nameMatch[1])) name = nameMatch[1].trim();

    const roleMatch = content.match(/\*\*Role:\*\*\s*(.+)/);
    if (roleMatch && !isPlaceholder(roleMatch[1])) role = roleMatch[1].trim();

    if (!role) {
      const creatureMatch = content.match(/\*\*Creature:\*\*\s*(.+)/);
      if (creatureMatch && !isPlaceholder(creatureMatch[1])) role = creatureMatch[1].trim();
    }
    if (!role) {
      const vibeMatch = content.match(/\*\*Vibe:\*\*\s*(.+)/);
      if (vibeMatch && !isPlaceholder(vibeMatch[1])) role = vibeMatch[1].trim();
    }
  }

  // Try SOUL.md title for name and role
  if (await fileExists(soulPath)) {
    const soulContent = await readFile(soulPath, 'utf-8');
    const lines = soulContent.split('\n');
    for (const line of lines) {
      const titleMatch = line.match(/^#\s+(.+?)(?:\s*\((.+?)\))?\s*$/);
      if (titleMatch && !isPlaceholder(titleMatch[1])) {
        if (!name || isPlaceholder(name)) {
          name = titleMatch[1].trim();
        }
        if (!role && titleMatch[2]) {
          role = titleMatch[2].trim();
        }
        break;
      }
    }
    if (!role) {
      for (const line of lines) {
        const taglineMatch = line.match(/^\*(.+)\*$/);
        if (taglineMatch && !taglineMatch[1].includes('chatbot') && !taglineMatch[1].includes('becoming')) {
          role = taglineMatch[1].trim();
          break;
        }
      }
    }
  }

  // Fallback: capitalize agent id
  if (!name || isPlaceholder(name)) {
    name = agentId.charAt(0).toUpperCase() + agentId.slice(1);
  }

  // Clean up name: remove parenthetical if already captured role
  const parenMatch = name.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    name = parenMatch[1].trim();
    if (!role) role = parenMatch[2].trim();
  }

  const meta: AgentMeta = {
    name,
    role: role || '',
    avatar: name.slice(0, 2),
  };

  if (maxMtime > 0) {
    metaCache.set(agentId, { meta, mtime: maxMtime });
  }

  return meta;
}

async function getLatestSession(agentId: string): Promise<{ path: string; mtime: number } | null> {
  const sessionsDir = join(AGENTS_DIR, agentId, 'sessions');
  try {
    const files = await readdir(sessionsDir);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    const withStats = await Promise.all(
      jsonlFiles.map(async f => {
        const fp = join(sessionsDir, f);
        const s = await stat(fp);
        return { path: fp, mtime: s.mtimeMs };
      })
    );
    withStats.sort((a, b) => b.mtime - a.mtime);
    return withStats[0] || null;
  } catch {
    return null;
  }
}

const TAIL_BYTES = 8192; // 8KB

/**
 * Read only the tail of a file (last 8KB) and parse JSONL lines
 */
async function parseLastLines(filePath: string, maxLines: number): Promise<unknown[]> {
  try {
    const fh = await open(filePath, 'r');
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
        // Drop first partial line
        const firstNewline = raw.indexOf('\n');
        content = firstNewline >= 0 ? raw.slice(firstNewline + 1) : raw;
      }

      const lines = content.trim().split('\n').slice(-maxLines);
      return lines
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean);
    } finally {
      await fh.close();
    }
  } catch {
    return [];
  }
}

function parseTimestamp(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const n = Number(ts);
    if (!isNaN(n)) return n;
    const d = new Date(ts).getTime();
    return isNaN(d) ? 0 : d;
  }
  return 0;
}

async function getLastMessageTime(filePath: string): Promise<number> {
  const entries = await parseLastLines(filePath, 20);
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as any;
    const ts = parseTimestamp(entry.timestamp);
    if (ts) return ts;
  }
  return 0;
}

const SKIP_MESSAGES = ['NO_REPLY', 'HEARTBEAT_OK'];

/**
 * Get recent activities - reads tail of file, iterates from end, stops when maxCount found
 */
async function getRecentActivities(filePath: string, maxCount: number): Promise<{ text: string; timestamp: number }[]> {
  const entries = await parseLastLines(filePath, 200);
  const results: { text: string; timestamp: number }[] = [];

  // Iterate from end to find recent assistant messages - stop early
  for (let i = entries.length - 1; i >= 0 && results.length < maxCount; i--) {
    const entry = entries[i] as any;
    const ts = parseTimestamp(entry.timestamp);
    if (!ts) continue;

    const msg = entry.message;
    if (!msg || msg.role !== 'assistant') continue;

    const content = msg.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type === 'text' && block.text && !SKIP_MESSAGES.includes(block.text.trim())) {
        const text = block.text.length > 120 ? block.text.slice(0, 120) + '…' : block.text;
        results.push({ text, timestamp: ts });
        break; // one message per entry
      }
    }
  }

  return results.reverse(); // oldest first
}

// Time-aware thresholds: relax during late night (23:00-08:00)
function getStatusThresholds(): { online: number; busy: number } {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 8) {
    return { online: 10, busy: 60 };
  }
  return { online: 5, busy: 30 };
}

function resolveStatus(lastActiveMin: number): Agent['status'] {
  const { online, busy } = getStatusThresholds();
  if (lastActiveMin < online) return 'online';
  if (lastActiveMin <= busy) return 'busy';
  if (lastActiveMin <= busy * 3) return 'away';
  return 'offline';
}

/**
 * Infer action type from message content
 */
function inferAction(text: string): string {
  const lower = text.toLowerCase();
  if (/pr|#\d+|合并|merge|review|审核/.test(lower)) return '代码审查';
  if (/测试|test|pass|fail|failed|skip/.test(lower)) return '测试验证';
  if (/部署|deploy|构建|build|ci|发布|release/.test(lower)) return '构建部署';
  if (/需求|prd|规划|backlog|迭代/.test(lower)) return '需求工作';
  if (/心跳|heartbeat|ok/.test(lower)) return '心跳检测';
  return '工作';
}

/**
 * Single-pass: fetch both agents and activities from files simultaneously
 */
export async function fetchAgentsAndActivities(): Promise<{ agents: Agent[]; activities: Activity[] }> {
  const agentIds = await discoverAgentIds();
  const agents: Agent[] = [];
  const activities: Activity[] = [];
  const now = Date.now();

  for (const agentId of agentIds) {
    const meta = await extractAgentMeta(agentId);
    const session = await getLatestSession(agentId);

    if (!session) {
      agents.push({
        id: agentId,
        name: meta.name,
        role: meta.role,
        status: 'offline',
        lastSeen: new Date(now - 86400000).toISOString(),
        avatar: meta.avatar,
        pendingTasks: 0,
        heartbeatFailures: 0,
        lastActivity: null,
        issueCount: 0,
      });
      continue;
    }

    const fileMtimeMin = (now - session.mtime) / 60_000;
    const lastMsgTime = await getLastMessageTime(session.path);
    const lastMsgMin = lastMsgTime ? (now - lastMsgTime) / 60_000 : fileMtimeMin;
    const status = resolveStatus(lastMsgMin);
    const lastSeenTs = lastMsgTime ? Math.max(session.mtime, lastMsgTime) : session.mtime;
    const recentActs = await getRecentActivities(session.path, 5);
    const lastAct = recentActs[recentActs.length - 1];

    agents.push({
      id: agentId,
      name: meta.name,
      role: meta.role,
      status,
      lastSeen: new Date(lastSeenTs).toISOString(),
      avatar: meta.avatar,
      pendingTasks: 0,
      heartbeatFailures: 0,
      lastActivity: lastAct?.text || null,
      issueCount: 0,
    });

    // Build activities from the same data
    for (const act of recentActs) {
      activities.push({
        id: `${agentId}-${act.timestamp}`,
        agentId,
        agentName: meta.name,
        action: inferAction(act.text),
        detail: act.text,
        timestamp: new Date(act.timestamp).toISOString(),
      });
    }
  }

  // Sort agents: online/busy first, then by lastSeen desc
  const statusOrder: Record<string, number> = { online: 0, busy: 1, away: 2, error: 3, offline: 4 };
  agents.sort((a, b) => {
    const so = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    if (so !== 0) return so;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  // Sort activities by timestamp desc
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { agents, activities };
}

// Backwards-compatible wrappers
export async function fetchAgentsFromFiles(): Promise<Agent[]> {
  const { agents } = await fetchAgentsAndActivities();
  return agents;
}

export async function fetchActivitiesFromFiles(): Promise<Activity[]> {
  const { activities } = await fetchAgentsAndActivities();
  return activities;
}
