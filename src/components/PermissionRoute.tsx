import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { usePermission } from "../contexts/PermissionContext";

interface PermissionRouteProps {
  /** Required permission code, e.g. "role:manage". */
  permission: string;
  /** Child elements to render if authorized. */
  children: ReactNode;
}

/**
 * Permission route guard: redirects to /admin/forbidden if the user
 * lacks the required permission.
 *
 * Uses JWT-cached permissions (via PermissionContext).
 * Must be used inside PermissionProvider and AdminRoute.
 */
export default function PermissionRoute({
  permission,
  children,
}: PermissionRouteProps) {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return <Navigate to="/admin/forbidden" replace />;
  }

  return <>{children}</>;
}
