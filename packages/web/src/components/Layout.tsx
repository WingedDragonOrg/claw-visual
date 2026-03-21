import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>🐾 Claw Visual</h1>
          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              团队总览
            </NavLink>
            <NavLink to="/channels" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              频道视图
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
