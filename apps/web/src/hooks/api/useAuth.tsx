import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/user.store';
import { UserDto } from '../../api/types';
import { useCurrentUser, useLogout } from './useUserApi';

interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const { data: user, isLoading } = useCurrentUser();
  const logoutMutation = useLogout();
  const setUserInStore = useUserStore((s: { setUser: (u: UserDto | null) => void }) => s.setUser);

  // Sync user data with store
  useEffect(() => {
    setUserInStore(user ?? null);
  }, [user, setUserInStore]);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: user ?? null, isLoading, logout }),
    [user, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
