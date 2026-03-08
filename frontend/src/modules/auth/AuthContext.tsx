import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../../types';
import { login as loginApi } from '../../api/auth';
import { setAccessToken, setSessionExpiredHandler } from '../../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setAccessToken(null);
      setSessionExpired(true);
      const returnPath = location.pathname + location.search;
      navigate(`/login?returnTo=${encodeURIComponent(returnPath)}`);
    });
  }, [navigate, location]);

  const loginFn = useCallback(async (email: string, password: string) => {
    const response = await loginApi({ email, password });
    setAccessToken(response.accessToken);
    setUser(response.user);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login: loginFn,
        logout,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
