import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, clearSession, readSession, saveSession } from '../api.js';

const AuthContext = createContext(null);

const rolePermissions = {
  ADMIN: ['requests.read', 'requests.write', 'requests.transition'],
  COORDINADORA: ['requests.read', 'requests.write', 'requests.transition'],
  SOLICITANTE: ['requests.write'],
};

function validSession() {
  const session = readSession();
  if (!session?.accessToken || !session?.expiresAt) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    clearSession();
    return null;
  }
  return session;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => validSession());

  useEffect(() => {
    const handleUnauthorized = () => setSession(null);
    window.addEventListener('consultorio:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('consultorio:unauthorized', handleUnauthorized);
  }, []);

  async function login(email, password) {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const nextSession = {
      accessToken: response.accessToken,
      expiresAt: response.expiresAt,
      user: {
        id: response.userId,
        email: response.email,
        fullName: response.nombreCompleto,
        roles: response.roles,
      },
    };
    saveSession(nextSession);
    setSession(nextSession);
    return nextSession.user;
  }

  async function logout() {
    clearSession();
    setSession(null);
  }

  const permissions = useMemo(
    () => new Set(session?.user?.roles?.flatMap((role) => rolePermissions[role] || []) || []),
    [session],
  );

  const value = useMemo(
    () => ({
      user: session?.user || null,
      loading: false,
      login,
      logout,
      refreshUser: async () => session?.user || null,
      can: (permission) => permissions.has(permission),
    }),
    [permissions, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

