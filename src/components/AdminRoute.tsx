import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthContext } from "../contexts/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Admin route guard: redirects non-admin users to /cloud-games.
 *
 * Must be used inside ProtectedRoute (which checks authentication).
 * While auth state is loading, renders a spinner to avoid
 * flash-of-wrong-content.
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { authState } = useAuthContext();
  const location = useLocation();

  // Show spinner while auth state is loading
  if (authState.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#3b9eff]" />
          <span className="text-sm text-slate-400">加载中…</span>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but has no admin permissions — redirect to front-end home
  // Check for specific admin-level permissions rather than just "any permission"
  const adminPermissions = [
    "dashboard:view", "user:view", "user:manage", "platform:view",
    "platform:manage", "desktop:view", "desktop:manage", "deal:view",
    "deal:manage", "game:view", "game:manage", "role:manage",
    "settings:manage", "announcement:view", "announcement:manage",
    "message:view", "message:manage", "log:view", "banner:read",
    "banner:write", "page:manage",
  ];
  const hasAdminAccess =
    authState.user?.isAdmin === true ||
    (authState.user?.permissions?.some((p) => adminPermissions.includes(p)) ?? false);

  if (!hasAdminAccess) {
    return <Navigate to="/cloud-games" replace />;
  }

  return <>{children}</>;
}
