import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiClient, extractErrorMessage, setAuthToken } from "../api/client";
import { AuthResponse, UserDto } from "../api/types";

interface Credentials {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

interface LocationState {
  from?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "expense-ai-token";

async function fetchMe(): Promise<UserDto> {
  const { data } = await apiClient.get<{ user: UserDto }>("/users/me");
  return data.user;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token) {
      setAuthToken(null);
      setIsLoading(false);
      return;
    }

    setAuthToken(token);
    fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = useCallback(
    async (credentials: Credentials) => {
      setIsLoading(true);
      try {
        const { data } = await apiClient.post<AuthResponse>("/auth/login", credentials);
        setAuthToken(data.accessToken);
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
        const state = location.state as LocationState | null;
        const from = state?.from ?? "/app";
        navigate(from, { replace: true });
      } catch (error) {
        throw new Error(extractErrorMessage(error, "Login failed"));
      } finally {
        setIsLoading(false);
      }
    },
    [location.state, navigate],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, logout }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
