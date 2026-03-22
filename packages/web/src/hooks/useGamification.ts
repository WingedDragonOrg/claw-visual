import { useState, useCallback, useRef } from 'react';
import type { Agent, AgentStatus } from '../types';

export interface RankingEntry {
  agentId: string;
  name: string;
  score: number;
  rank: number;
  status: AgentStatus;
}

interface UseGamificationOptions {
  /** Points per 30s interval */
  onlinePoints?: number;
  busyPoints?: number;
  errorPoints?: number;
  onRankingsUpdate?: (rankings: RankingEntry[]) => void;
}

const POINTS = {
  online: 1,
  busy: 2,
  error: 0,
  away: 0,
  offline: 0,
};

export function useGamification(options: UseGamificationOptions = {}) {
  const {
    onlinePoints = POINTS.online,
    busyPoints = POINTS.busy,
    errorPoints = POINTS.error,
    onRankingsUpdate,
  } = options;

  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const scoresRef = useRef<Map<string, number>>(new Map());
  const lastSeenRef = useRef<Map<string, AgentStatus>>(new Map());

  /** Call on each agent-update event */
  const onAgentUpdate = useCallback((agents: Agent[]) => {
    const scores = scoresRef.current;

    agents.forEach((agent) => {
      const prevStatus = lastSeenRef.current.get(agent.id);
      const prevScore = scores.get(agent.id) ?? 0;

      // Award points only when status is online/busy/error
      let earned = 0;
      if (agent.status === 'online') earned = onlinePoints;
      else if (agent.status === 'busy') earned = busyPoints;
      else if (agent.status === 'error') earned = errorPoints;

      scores.set(agent.id, prevScore + earned);
      lastSeenRef.current.set(agent.id, agent.status);
    });

    // Sort and build rankings
    const sorted: RankingEntry[] = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([agentId, score], index) => {
        const agent = agents.find((ag) => ag.id === agentId);
        return {
          agentId,
          name: agent?.name ?? agentId,
          score,
          rank: index + 1,
          status: agent?.status ?? 'offline',
        };
      });

    setRankings(sorted);
    onRankingsUpdate?.(sorted);
  }, [onlinePoints, busyPoints, errorPoints, onRankingsUpdate]);

  /** Reset daily rankings */
  const resetDaily = useCallback(() => {
    scoresRef.current.clear();
    lastSeenRef.current.clear();
    setRankings([]);
  }, []);

  /** Get score for specific agent */
  const getScore = useCallback((agentId: string): number => {
    return scoresRef.current.get(agentId) ?? 0;
  }, []);

  return {
    rankings,
    onAgentUpdate,
    resetDaily,
    getScore,
  };
}
