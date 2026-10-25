import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, readToken, saveToken } from './api';
import type { SessionUser } from './types';

type AuthState = {
  token: string | null;
  user: SessionUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    api<SessionUser>('/api/v1/auth/me')
      .then((me) => {
        if (active) {
          setUser(me);
        }
      })
      .catch(() => {
        if (active) {
          clearToken();
          setToken(null);
          setUser(null);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo<AuthState>(() => ({
    token,
    user,
    async login(email: string, password: string) {
      const result = await api<{ accessToken: string; user: SessionUser }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveToken(result.accessToken);
      setToken(result.accessToken);
      setUser(result.user);
    },
    logout() {
      clearToken();
      setToken(null);
      setUser(null);
    },
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return value;
}
