import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { AuthContextValue, AuthState, User } from "../types";
import { apiClient } from "../services/api";

/** Standard API envelope returned by the backend functions. */
interface ApiResponse {
  code: number;
  message?: string;
  data?: { user: User };
}

/** Initial auth state — unauthenticated, loading until /api/me resolves. */
const initialAuthState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

/** Auth context with a default no-op implementation. */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider manages global authentication state.
 *
 * S-05: JWT is stored in an HttpOnly cookie (set by the server).
 * The frontend cannot read the token — it only knows the user info
 * returned by the login/register/refresh endpoints.
 *
 * - On mount: calls /api/me to check if the cookie is valid.
 * - Provides login / register / logout methods.
 * - Auto-refreshes the token every 30 minutes.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Handle HTTP 401 Unauthorized from the API client.
   * Clears auth state and redirects to /login.
   */
  const handleUnauthorized = useCallback(() => {
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
    navigate("/login", {
      replace: true,
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      },
    });
  }, [navigate, location]);

  // Register the 401 handler on the API client.
  useEffect(() => {
    apiClient.onUnauthorized = handleUnauthorized;
    return () => {
      apiClient.onUnauthorized = null;
    };
  }, [handleUnauthorized]);

  // On mount: call /api/me to check if the HttpOnly cookie is valid.
  // This replaces the old localStorage token check.
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const user = await apiClient.getMe();
        if (mounted) {
          setAuthState({
            user,
            token: null, // Token is in HttpOnly cookie — not accessible to JS
            isAuthenticated: true,
            loading: false,
          });
        }
      } catch {
        // Not authenticated — cookie missing, invalid, or expired.
        if (mounted) {
          setAuthState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-refresh: call /api/refresh-token every 30 minutes.
  // The endpoint reads the cookie, verifies the JWT, and sets a new cookie.
  // If the JWT has expired, it returns 401 and the onUnauthorized handler fires.
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/refresh-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const result: ApiResponse = await response.json();
        if (result.code === 0 && result.data?.user) {
          setAuthState((prev) => ({
            ...prev,
            user: result.data.user,
          }));
        }
      } catch {
        // Silent fail — will retry on next interval tick.
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  /** Log in with email and password via the API. */
  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const result: ApiResponse = await response.json();
    if (result.code !== 0) {
      throw new Error(result.message || "登录失败");
    }
    const { user } = result.data;
    setAuthState({
      user,
      token: null,
      isAuthenticated: true,
      loading: false,
    });
  }, []);

  /** Register a new account with email verification code via the API. */
  const register = useCallback(
    async (email: string, code: string, password: string) => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code, password }),
      });
      const result: ApiResponse = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "注册失败");
      }
      const { user } = result.data;
      setAuthState({
        user,
        token: null,
        isAuthenticated: true,
        loading: false,
      });
    },
    []
  );

  /** Log in / register with phone number and SMS verification code via the API. */
  const smsLogin = useCallback(async (phone: string, code: string) => {
    const response = await fetch("/api/sms-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ phone, code }),
    });
    const result: ApiResponse = await response.json();
    if (result.code !== 0) {
      throw new Error(result.message || "登录失败");
    }
    const { user } = result.data;
    setAuthState({
      user,
      token: null,
      isAuthenticated: true,
      loading: false,
    });
  }, []);

  /** Log out: call /api/logout to clear the HttpOnly cookie, then clear state. */
  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if the API call fails, clear local state.
    }
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ authState, login, register, smsLogin, logout }),
    [authState, login, register, smsLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook to access the auth context. Throws if used outside AuthProvider. */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
