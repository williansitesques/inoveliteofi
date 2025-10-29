import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, me as apiMe, logout as apiLogout, updateProfileApi } from '@/services/auth';
import { useUsers } from '@/store/users';
import type { AuthUser, AuthResponse } from '@/types/auth';

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: AuthUser, persist?: boolean) => void;
  login: (email: string, password: string, persist?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'email'>>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((t: string, u: AuthUser, persist?: boolean) => {
    setToken(t);
    setUser(u);
    if (persist) localStorage.setItem('auth:token', t);
    else localStorage.removeItem('auth:token');
  }, []);

  const doLogin = useCallback(async (email: string, password: string, persist?: boolean) => {
    const res: AuthResponse = await apiLogin({ email, password });
    setSession(res.token, res.user, persist);
  }, [setSession]);

  const doLogout = useCallback(async () => {
    await apiLogout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth:token');
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Pick<AuthUser, 'name' | 'email'>>) => {
    const updated = await updateProfileApi(patch);
    setUser(updated);
    try {
      const st = useUsers.getState();
      const idx = st.users.findIndex((x) => x.id === updated.id);
      if (idx >= 0) {
        st.updateUser(updated.id, { name: updated.name, email: updated.email });
      }
    } catch {}
  }, []);

  const changePassword = useCallback(async (_current: string, _next: string) => {
    await new Promise((r) => setTimeout(r, 300));
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const t = localStorage.getItem('auth:token');
        if (!t) return;
        setToken(t);
        const u = await apiMe();
        setUser(u);
      } catch (_) {
        localStorage.removeItem('auth:token');
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(id);
  }, [loading]);

  const value = useMemo(() => ({ user, token, loading, setSession, login: doLogin, logout: doLogout, updateProfile, changePassword }), [user, token, loading, setSession, doLogin, doLogout, updateProfile, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}