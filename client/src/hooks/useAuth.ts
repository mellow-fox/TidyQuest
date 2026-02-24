import { useState, useEffect, useCallback } from 'react';
import { api } from './useApi';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'member' | 'child';
  avatarColor: string;
  avatarType: 'letter' | 'preset' | 'photo';
  avatarPreset: string | null;
  avatarPhotoUrl: string | null;
  coins: number;
  currentStreak: number;
  isVacationMode: boolean;
  language: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('tidyquest_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await api.me();
      setUser(userData);
    } catch {
      localStorage.removeItem('tidyquest_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (username: string, password: string) => {
    const { token, user: userData } = await api.login({ username, password });
    localStorage.setItem('tidyquest_token', token);
    setUser(userData);
  };

  const register = async (data: { username: string; password: string; displayName: string; avatarColor?: string; language?: string }) => {
    const { token, user: userData } = await api.register(data);
    localStorage.setItem('tidyquest_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('tidyquest_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.me();
      // Guard: don't restore session if user logged out during the in-flight request
      if (localStorage.getItem('tidyquest_token')) {
        setUser(userData);
      }
    } catch { /* ignore */ }
  };

  return { user, loading, login, register, logout, refreshUser };
}
