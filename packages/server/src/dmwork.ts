/**
 * DMWork API integration - fetch group names dynamically
 */
import { readFileSync } from 'fs';

const OPENCLAW_CONFIG = process.env.OPENCLAW_CONFIG || '/var/openclaw/.openclaw/openclaw.json';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface GroupInfo {
  group_no: string;
  name: string;
}

let cachedGroups: Record<string, string> = {};
let lastFetchTime = 0;

function getBotToken(): { apiUrl: string; token: string } | null {
  try {
    const cfg = JSON.parse(readFileSync(OPENCLAW_CONFIG, 'utf-8'));
    const dmwork = cfg?.channels?.dmwork;
    if (!dmwork) return null;

    const apiUrl = dmwork.apiUrl || 'https://im.deepminer.com.cn/api';

    // Try any account's botToken
    const accounts = dmwork.accounts || {};
    for (const acctId of Object.keys(accounts)) {
      const token = accounts[acctId]?.botToken;
      if (token) return { apiUrl, token };
    }

    // Fallback to top-level botToken
    if (dmwork.botToken) return { apiUrl, token: dmwork.botToken };

    return null;
  } catch {
    return null;
  }
}

async function fetchGroupsFromAPI(): Promise<Record<string, string>> {
  const creds = getBotToken();
  if (!creds) {
    console.log('[dmwork] No bot token found in config, using empty group names');
    return {};
  }

  try {
    const resp = await fetch(`${creds.apiUrl}/v1/bot/groups`, {
      headers: { Authorization: `Bearer ${creds.token}` },
    });

    if (!resp.ok) {
      console.log(`[dmwork] Groups API returned ${resp.status}`);
      return cachedGroups; // return stale cache on error
    }

    const groups: GroupInfo[] = await resp.json();
    const mapping: Record<string, string> = {};
    for (const g of groups) {
      if (g.group_no && g.name) {
        mapping[`group:${g.group_no}`] = g.name;
      }
    }

    console.log(`[dmwork] Loaded ${Object.keys(mapping).length} group names`);
    return mapping;
  } catch (err) {
    console.log(`[dmwork] Failed to fetch groups:`, err);
    return cachedGroups;
  }
}

/**
 * Get group name by conversation label (e.g. "group:abc123...")
 * Returns group name or undefined
 */
export async function getGroupName(conversationLabel: string): Promise<string | undefined> {
  // Refresh cache if stale
  if (Date.now() - lastFetchTime > CACHE_TTL) {
    cachedGroups = await fetchGroupsFromAPI();
    lastFetchTime = Date.now();
  }

  return cachedGroups[conversationLabel];
}

/**
 * Get all cached group names (call after at least one getGroupName)
 */
export function getCachedGroupNames(): Record<string, string> {
  return { ...cachedGroups };
}

/**
 * Force refresh group names from API
 */
export async function refreshGroupNames(): Promise<Record<string, string>> {
  cachedGroups = await fetchGroupsFromAPI();
  lastFetchTime = Date.now();
  return { ...cachedGroups };
}
