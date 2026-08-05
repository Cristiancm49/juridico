import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/v1/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const current = await apiFetch('/api/v1/auth/me');
    setUser(current.user);
    return data.user;
  }

  async function logout() {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null);
  }

  async function refreshUser() {
    const current = await apiFetch('/api/v1/auth/me');
    setUser(current.user);
    return current.user;
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      can: (permission) => user?.permissions?.includes(permission) || false,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
