import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from './TeamContext';

export function TeamSwitcher() {
  const { teams, activeTeam, setActiveTeamId } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (teams.length === 0) {
    return (
      <button className="team-switcher-btn team-switcher-empty" onClick={() => navigate('/settings')}>
        + Add Team
      </button>
    );
  }

  return (
    <div className="team-switcher" ref={ref}>
      <button className="team-switcher-btn" onClick={() => setOpen(!open)}>
        <span className="team-switcher-name">{activeTeam?.name ?? 'Select Team'}</span>
        <span className="team-switcher-arrow">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open && (
        <div className="team-switcher-dropdown">
          {teams.map(t => (
            <button
              key={t.id}
              className={`team-switcher-option ${t.id === activeTeam?.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTeamId(t.id);
                setOpen(false);
              }}
            >
              <span className="team-switcher-option-name">{t.name}</span>
              {t.id === activeTeam?.id && <span className="team-switcher-check">&#10003;</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
