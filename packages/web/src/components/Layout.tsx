import { NavLink, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function Layout() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setOnlineCount(data.online ?? null);
        }
      } catch {
        // silently fail
      }
    };
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, []);

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
          </div>
          <div className="nav-right">
            {onlineCount !== null && (
              <span className="nav-badge">
                <span className="dot" />
                {onlineCount} online
              </span>
            )}
          </div>
        </div>
      </nav>
      <div className="app">
        <Outlet />
      </div>
    </>
  );
}
