import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setUnauthenticatedHandler } from './api.js';

const AuthContext = createContext(null);

function matches(granted, required) {
  if (granted === '*') return true;
  const [gRes, gAct = '*'] = granted.split(':');
  const [rRes, rAct] = required.split(':');
  if (gRes !== '*' && gRes !== rRes) return false;
  return gAct === '*' || gAct === rAct;
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    setAdmin(null);
    setPermissions([]);
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(clear);
  }, [clear]);

  // On boot, ask the API who we are. The cookie survives a page reload, so a
  // refresh should not require signing in again.
  useEffect(() => {
    let cancelled = false;
    api.get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setAdmin(res.data.admin);
        setPermissions(res.data.permissions);
      })
      .catch(() => { if (!cancelled) clear(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clear]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setAdmin(res.data.admin);
    setPermissions(res.data.permissions);
    return res.data.admin;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    clear();
  }, [clear]);

  const value = useMemo(() => ({
    admin,
    permissions,
    loading,
    login,
    logout,
    setAdmin,
    /**
     * Mirrors the server's check so the UI can hide what the caller cannot do.
     * This is a courtesy, not a control — the API enforces the same rule.
     */
    can: (required) => permissions.some((g) => matches(g, required)),
    isSuperAdmin: admin?.role === 'super_admin',
  }), [admin, permissions, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
