import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthContext } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard: redirects unauthenticated users to /login.
 *
 * Checks the AuthContext for a valid token. While the initial auth
 * state is loading, renders nothing to avoid flash-of-wrong-content.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authState } = useAuthContext();
  const location = useLocation();

  // Show nothing while checking auth state on initial load
  if (authState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-game-dark">
        <div className="text-slate-400">加载中…</div>
      </div>
    );
  }

  // Redirect to login if not authenticated, preserving the intended destination
  if (!authState.isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}
