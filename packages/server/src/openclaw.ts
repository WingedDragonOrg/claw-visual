import type { Agent, Activity } from './types.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS_DIR = '/home/ubuntu/.openclaw/agents';
const KNOWN_AGENTS = [
  { id: 'xiaochan', name: '小产', role: '产品经理', avatar: 'XC' },
  { id: 'xiaojia', name: '小架', role: '技术架构/开发', avatar: 'XJ' },
  { id: 'xiakai', name: '小开', role: '前端/后端开发', avatar: 'XK' },
  { id: 'xiaoshen', name: '小审', role: '质量审核', avatar: 'XS' },
  { id: 'xiace', name: '小测', role: '测试', avatar: 'XT' },
  { id: 'main', name: '小爱同学', role: '私人助理', avatar: 'XA' },
];

function getLatestSession(agentId: string): { path: string; mtime: number } | null {
  const sessionsDir = join(AGENTS_DIR, agentId, 'sessions');
  try {
    const files = readdirSync(sessionsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const fp = join(sessionsDir, f);
        return { path: fp, mtime: statSync(fp).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return files[0] || null;
  } catch {
    return null;
  }
}

function parseLastLines(filePath: string, maxLines: number): unknown[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').slice(-maxLines);
    return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
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

function getLastMessageTime(filePath: string): number {
  const entries = parseLastLines(filePath, 20);
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as any;
    const ts = parseTimestamp(entry.timestamp);
    if (ts) return ts;
  }
  return 0;
}

function getLastActivity(filePath: string): { text: string; timestamp: number } | null {
  const entries = parseLastLines(filePath, 50);
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as any;
    const ts = parseTimestamp(entry.timestamp);
    if (!ts) continue;

    // JSONL format: { type, message: { role, content } }
    const msg = entry.message;
    if (!msg || msg.role !== 'assistant') continue;

    const content = msg.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type === 'text' && block.text && block.text !== 'NO_REPLY' && block.text !== 'HEARTBEAT_OK') {
        const text = block.text.length > 120 ? block.text.slice(0, 120) + '…' : block.text;
        return { text, timestamp: ts };
      }
    }
  }
  return null;
}

function resolveStatus(lastActiveMin: number): Agent['status'] {
  if (lastActiveMin < 5) return 'online';
  if (lastActiveMin <= 30) return 'busy';
  return 'error';
}

export async function fetchAgentsFromFiles(): Promise<Agent[]> {
  const agents: Agent[] = [];
  const now = Date.now();

  for (const info of KNOWN_AGENTS) {
    const session = getLatestSession(info.id);
    if (!session) {
      agents.push({ ...info, status: 'offline', lastSeen: new Date(now - 86400000).toISOString(), pendingTasks: 0, heartbeatFailures: 0 });
      continue;
    }

    const fileMtimeMin = (now - session.mtime) / 60_000;
    const lastMsgTime = getLastMessageTime(session.path);
    const lastMsgMin = lastMsgTime ? (now - lastMsgTime) / 60_000 : fileMtimeMin;
    const status = resolveStatus(lastMsgMin);
    const lastSeenTs = lastMsgTime ? Math.max(session.mtime, lastMsgTime) : session.mtime;

    agents.push({
      ...info,
      status,
      lastSeen: new Date(lastSeenTs).toISOString(),
      pendingTasks: 0,
      heartbeatFailures: 0,
    });
  }

  return agents;
}

export async function fetchActivitiesFromFiles(): Promise<Activity[]> {
  const activities: Activity[] = [];

  for (const info of KNOWN_AGENTS) {
    const session = getLatestSession(info.id);
    if (!session) continue;
    const act = getLastActivity(session.path);
    if (act) {
      activities.push({
        id: `${info.id}-latest`,
        agentId: info.id,
        agentName: info.name,
        action: '最近活动',
        detail: act.text,
        timestamp: new Date(act.timestamp).toISOString(),
      });
    }
  }

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
