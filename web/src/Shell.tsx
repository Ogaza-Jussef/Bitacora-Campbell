import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './auth';

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-campbell.png" alt="" width={42} height={42} />
          <div>
            <strong>Campbell</strong>
            <span>Soporte TI</span>
          </div>
        </div>
        <nav aria-label="Secciones">
          <NavLink to="/" end>Registros</NavLink>
          <NavLink to="/preventivo">Preventivo</NavLink>
          <NavLink to="/correctivo">Correctivo</NavLink>
          <NavLink to="/tablero">Tablero</NavLink>
        </nav>
        <div className="sidebar-foot">
          <p>{user?.nombre}</p>
          <button type="button" className="ghost" onClick={logout}>Salir</button>
        </div>
      </aside>
      <div className="workspace">{children}</div>
    </div>
  );
}
