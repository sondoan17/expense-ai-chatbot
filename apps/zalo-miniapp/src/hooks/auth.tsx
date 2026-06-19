import { PropsWithChildren, createContext, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'zmp-ui';

import { UserDto } from '../api/types';
import { useCurrentUser, useLogout } from './api';

interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const { data: user, isLoading } = useCurrentUser();
  const logoutMutation = useLogout();
  const value = useMemo(
    () => ({ user: user ?? null, isLoading, logout: () => logoutMutation.mutate() }),
    [user, isLoading, logoutMutation],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !user) navigate('/login', { replace: true });
  }, [isLoading, navigate, user]);
  if (isLoading) return <div className="mimi-page mimi-center">Đang tải Mimi...</div>;
  if (!user) return <div className="mimi-page mimi-center">Đang chuyển hướng...</div>;
  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && user) navigate('/chat', { replace: true });
  }, [isLoading, navigate, user]);
  if (isLoading) return <div className="mimi-page mimi-center">Đang tải Mimi...</div>;
  if (user) return <div className="mimi-page mimi-center">Đang chuyển hướng...</div>;
  return <>{children}</>;
}
