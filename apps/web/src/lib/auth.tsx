'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  /** true right after the user clicked "log out" – no "return to" redirect then */
  loggedOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** One-click read-only demo access */
  loginAsGuest: () => Promise<void>;
  /** true for the read-only GUEST role: hide every create/edit/delete control */
  isGuest: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: (redirectTo?: string) => void;
  setUser: (u: User) => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!tokenStore.get()) return setLoading(false);
    api<User>('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const handleAuth = useCallback((r: { accessToken: string; user: User }) => {
    tokenStore.set(r.accessToken);
    setLoggedOut(false);
    qc.clear();
    setUser(r.user);
    router.push('/dashboard');
  }, [qc, router]);

  const login = useCallback(async (email: string, password: string) => {
    handleAuth(await api('/auth/login', { method: 'POST', body: { email, password } }));
  }, [handleAuth]);

  const loginAsGuest = useCallback(async () => {
    handleAuth(await api('/auth/guest', { method: 'POST' }));
  }, [handleAuth]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    handleAuth(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
  }, [handleAuth]);

  const logout = useCallback((redirectTo = '/login') => {
    tokenStore.clear();
    qc.clear();
    if (redirectTo !== '/login') {
      // Full navigation: avoids racing the app shell's own "not logged in → /login" redirect.
      window.location.assign(redirectTo);
      return;
    }
    setLoggedOut(true);
    setUser(null);
    router.replace('/login');
  }, [qc, router]);

  return <Ctx.Provider value={{ user, loading, loggedOut, login, loginAsGuest, isGuest: user?.role === 'GUEST', register, logout, setUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
