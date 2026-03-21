import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Team } from '../types';
import { setApiBase } from '../api';

const TEAMS_KEY = 'claw-teams';
const ACTIVE_KEY = 'claw-active-team';

function loadTeams(): Team[] {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveTeams(teams: Team[]) {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
}

function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function saveActiveId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

interface TeamContextValue {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeamId: (id: string) => void;
  addTeam: (team: Team) => void;
  updateTeam: (team: Team) => void;
  removeTeam: (id: string) => void;
  getApiBase: () => string;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(loadTeams);
  const [activeId, setActiveId] = useState<string | null>(loadActiveId);

  const activeTeam = teams.find(t => t.id === activeId) ?? teams[0] ?? null;

  const setActiveTeamId = useCallback((id: string) => {
    setActiveId(id);
    saveActiveId(id);
  }, []);

  const addTeam = useCallback((team: Team) => {
    setTeams(prev => {
      const next = [...prev, team];
      saveTeams(next);
      if (prev.length === 0) {
        setActiveId(team.id);
        saveActiveId(team.id);
      }
      return next;
    });
  }, []);

  const updateTeam = useCallback((team: Team) => {
    setTeams(prev => {
      const next = prev.map(t => t.id === team.id ? team : t);
      saveTeams(next);
      return next;
    });
  }, []);

  const removeTeam = useCallback((id: string) => {
    setTeams(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(t => t.id !== id);
      saveTeams(next);
      if (activeId === id) {
        const newActiveId = next[0]?.id ?? null;
        setActiveId(newActiveId);
        saveActiveId(newActiveId);
      }
      return next;
    });
  }, [activeId]);

  const getApiBase = useCallback(() => {
    if (activeTeam) {
      const url = activeTeam.gatewayUrl.replace(/\/+$/, '');
      return `${url}/api`;
    }
    const envBase = import.meta.env.VITE_API_BASE || '';
    return `${envBase}/api`;
  }, [activeTeam]);

  useEffect(() => {
    setApiBase(getApiBase());
  }, [getApiBase]);

  return (
    <TeamContext.Provider value={{ teams, activeTeam, setActiveTeamId, addTeam, updateTeam, removeTeam, getApiBase }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used within TeamProvider');
  return ctx;
}
