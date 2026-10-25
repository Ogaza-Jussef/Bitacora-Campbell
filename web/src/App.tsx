import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './auth';
import { BitacoraPage } from './pages/BitacoraPage';
import { CorrectivosPage } from './pages/CorrectivosPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PreventivosPage } from './pages/PreventivosPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><BitacoraPage /></RequireAuth>} />
      <Route path="/preventivo" element={<RequireAuth><PreventivosPage /></RequireAuth>} />
      <Route path="/correctivo" element={<RequireAuth><CorrectivosPage /></RequireAuth>} />
      <Route path="/tablero" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!user) {
    return <p className="status">Cargando sesión…</p>;
  }
  return children;
}
