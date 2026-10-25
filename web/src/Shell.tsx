import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './auth';

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <img src="/logo-campbell.png" alt="" width={46} height={46} />
        <div>
          <strong>Bitácora de Soportes</strong>
          <span>Fundación Campbell</span>
        </div>
        <nav>
          <NavLink to="/" end>Registros</NavLink>
          <NavLink to="/tablero">Tablero</NavLink>
        </nav>
        <p>{user?.nombre}</p>
        <button type="button" className="ghost" onClick={logout}>Salir</button>
      </header>
      {children}
    </>
  );
}
