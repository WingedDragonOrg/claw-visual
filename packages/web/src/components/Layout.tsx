import { NavLink, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchDashboard, fetchHealth } from '../api';
import { TeamSwitcher } from './TeamSwitcher';
import { useTeam } from './TeamContext';

export function Layout() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [isMock, setIsMock] = useState<boolean | null>(null);
  const { activeTeam } = useTeam();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, health] = await Promise.all([fetchDashboard(), fetchHealth()]);
        setOnlineCount(data.online ?? null);
        setIsMock(health.dataSource !== 'openclaw-files');
      } catch {
        // silently fail
      }
    };
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [activeTeam]);

  return (
    <>
      <nav className="nav-bar">
        <div className="nav-bar-inner">
          <a href="/" className="nav-brand">
            <span className="nav-brand-icon">&#128062;</span>
            <span>Claw Visual</span>
          </a>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Team
            </NavLink>
            <NavLink to="/channels" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Channels
            </NavLink>
            <NavLink to="/pixel" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              🎮 Pixel
            </NavLink>
          </div>
          <div className="nav-right">
            <TeamSwitcher />
            {onlineCount !== null && (
              <span className="nav-badge">
                <span className="dot" />
                {onlineCount} online
              </span>
            )}
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link nav-settings active' : 'nav-link nav-settings'} title="Settings">
              &#9881;
            </NavLink>
          </div>
        </div>
      </nav>
      {isMock === true && (
        <div style={{
          background: '#5c3a1e',
          color: '#fbbf24',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '13px',
          borderBottom: '1px solid #78522a',
        }}>
          ⚠️ 当前显示的是模拟数据，真实数据源暂不可用
        </div>
      )}
      <div className="app">
        <Outlet />
      </div>
    </>
  );
}
