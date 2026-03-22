import { useState, useCallback, useRef } from 'react';
import type { Agent, AgentStatus, GitHubSummary } from '../types';

interface AgentScore {
  agentId: string;
  agentName: string;
  score: number;
  busyMinutes: number;
  onlineMinutes: number;
  errorMinutes: number;
  issuesResolved: number;
  lastUpdated: number;
}

export interface LeaderboardEntry extends AgentScore {
  rank: number;
  status: AgentStatus;
}

interface UseGamificationOptions {
  /** Called when leaderboard data changes */
  onUpdate?: (leaderboard: LeaderboardEntry[]) => void;
}

const SCORE_WEIGHTS: Record<AgentStatus, number> = {
  busy: 2,
  online: 1,
  away: 0,
  offline: -1,
  error: -1,
};

const ISSUE_POINTS = 5;

export function useGamification(options: UseGamificationOptions = {}) {
  const { onUpdate } = options;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const scoresRef = useRef<Map<string, AgentScore>>(new Map());
  const lastSeenIssuesRef = useRef<Map<string, number>>(new Map());
  const lastTickRef = useRef<number>(Date.now());

  /** Accumulate points based on elapsed time and current agent states */
  const tick = useCallback((agents: Agent[]) => {
    const now = Date.now();
    const elapsedMs = now - lastTickRef.current;
    const elapsedMinutes = elapsedMs / 60000;
    lastTickRef.current = now;

    const scores = scoresRef.current;

    agents.forEach((agent) => {
      const existing = scores.get(agent.id) || {
        agentId: agent.id,
        agentName: agent.name,
        score: 0,
        busyMinutes: 0,
        onlineMinutes: 0,
        errorMinutes: 0,
        issuesResolved: 0,
        lastUpdated: now,
      };

      const weight = SCORE_WEIGHTS[agent.status] || 0;
      const earnedPoints = weight * elapsedMinutes;
      const earnedMinutes = elapsedMinutes;

      if (agent.status === 'busy') existing.busyMinutes += earnedMinutes;
      if (agent.status === 'online') existing.onlineMinutes += earnedMinutes;
      if (agent.status === 'error') existing.errorMinutes += earnedMinutes;

      existing.score += earnedPoints;
      existing.lastUpdated = now;
      scores.set(agent.id, existing);
    });

    // Sort by score descending
    const sorted = [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .map((s, i): LeaderboardEntry => {
        const agent = agents.find((ag) => ag.id === s.agentId);
        return {
          ...s,
          rank: i + 1,
          status: agent?.status ?? 'offline',
        };
      });

    setLeaderboard(sorted);
    onUpdate?.(sorted);
  }, [onUpdate]);

  /** Award bonus points for resolving an issue */
  const awardIssuePoints = useCallback((agentId: string) => {
    const score = scoresRef.current.get(agentId);
    if (score) {
      score.score += ISSUE_POINTS;
      score.issuesResolved += 1;
    }
  }, []);

  /** Handle GitHub refresh - award points for resolved issues */
  const handleGitHubRefresh = useCallback((summary: GitHubSummary, prevSummary?: GitHubSummary) => {
    if (!prevSummary) {
      // First load - seed last seen counts
      Object.entries(summary.byAssignee ?? {}).forEach(([assignee, count]) => {
        lastSeenIssuesRef.current.set(assignee, count);
      });
      return summary;
    }

    Object.entries(summary.byAssignee ?? {}).forEach(([assignee, count]) => {
      const lastSeen = lastSeenIssuesRef.current.get(assignee) ?? 0;
      if (count > lastSeen) {
        // Agent closed issues
        const delta = count - lastSeen;
        for (let i = 0; i < delta; i++) {
          awardIssuePoints(assignee);
        }
        lastSeenIssuesRef.current.set(assignee, count);
      }
    });

    return summary;
  }, [awardIssuePoints]);

  /** Reset all scores */
  const reset = useCallback(() => {
    scoresRef.current.clear();
    lastTickRef.current = Date.now();
    setLeaderboard([]);
  }, []);

  /** Get score for a specific agent */
  const getScore = useCallback((agentId: string): AgentScore | undefined => {
    return scoresRef.current.get(agentId);
  }, []);

  return {
    leaderboard,
    tick,
    handleGitHubRefresh,
    reset,
    getScore,
  };
}
