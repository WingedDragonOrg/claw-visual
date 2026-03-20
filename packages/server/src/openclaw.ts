import type { Agent, OpenClawSession } from './types.js';

const GATEWAY_URL = 'http://localhost:3111';
const TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

const AGENT_MAP: Record<string, { name: string; role: string; avatar: string }> = {
  xiaochan: { name: '小产', role: '产品经理', avatar: 'XC' },
  xiaojia: { name: '小架', role: '技术架构/开发', avatar: 'XJ' },
  xiaoshen: { name: '小审', role: '质量审核', avatar: 'XS' },
  xiaocce: { name: '小测', role: '测试', avatar: 'XT' },
  main: { name: '小爱同学', role: '私人助理', avatar: 'XA' },
};

function resolveStatus(session: OpenClawSession): Agent['status'] {
  if (session.status === 'offline') return 'offline';
  const lastActivity = session.lastActivity ? new Date(session.lastActivity).getTime() : 0;
  const diffMin = (Date.now() - lastActivity) / 60_000;
  if (diffMin < 5) return 'online';
  if (diffMin <= 30) return 'busy';
  return 'error';
}

export async function fetchSessionsFromGateway(): Promise<Agent[] | null> {
  if (!TOKEN) return null;

  try {
    const res = await fetch(`${GATEWAY_URL}/api/sessions`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const sessions: OpenClawSession[] = await res.json();
    return sessions.map((s) => {
      const info = AGENT_MAP[s.id] || { name: s.name || s.id, role: 'unknown', avatar: '??' };
      return {
        id: s.id,
        name: info.name,
        role: info.role,
        status: resolveStatus(s),
        lastSeen: s.lastActivity || new Date().toISOString(),
        avatar: info.avatar,
        pendingTasks: 0,
        heartbeatFailures: s.status === 'error' ? 2 : 0,
      };
    });
  } catch {
    return null;
  }
}
