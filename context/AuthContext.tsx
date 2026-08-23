'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOKEN_KEY } from '@/services/api';
import { authService } from '@/services/chat';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    router.replace('/login');
  }, [clearSession, router]);

  const login = useCallback(
    async (phone: string, name: string) => {
      const { token: newToken, user: newUser } = await authService.login(phone, name);
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(newUser);
      router.replace('/chat');
    },
    [router]
  );

  useEffect(() => {
    let cancelled = false;

    // Reads storage inside a promise so no state is set synchronously during the effect
    const restore = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) return null;
      return { savedToken, me: await authService.me() };
    };

    restore()
      .then((result) => {
        if (cancelled || !result) return;
        setToken(result.savedToken);
        setUser(result.me);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Any 401 from the API layer invalidates the session
  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
