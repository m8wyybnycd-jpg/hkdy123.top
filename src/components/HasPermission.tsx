import type { ReactNode } from "react";
import { usePermission } from "../contexts/PermissionContext";

interface HasPermissionProps {
  /** Required permission code, e.g. "announcement:manage". */
  code: string;
  /** Children to render if the user has the permission. */
  children: ReactNode;
  /** Fallback content to render if the user lacks the permission (default: null). */
  fallback?: ReactNode;
}

/**
 * Button-level permission guard component.
 *
 * Wraps children with a permission check: if the current user does not
 * have the specified permission code, the children are hidden (or the
 * fallback is rendered instead).
 *
 * Uses JWT-cached permissions via PermissionContext. Security is still
 * enforced server-side; this component only controls UI visibility.
 *
 * @example
 * ```tsx
 * <HasPermission code="announcement:manage">
 *   <button onClick={handleCreate}>新建公告</button>
 * </HasPermission>
 * ```
 */
export default function HasPermission({
  code,
  children,
  fallback = null,
}: HasPermissionProps) {
  const { hasPermission } = usePermission();
  if (!hasPermission(code)) return <>{fallback}</>;
  return <>{children}</>;
}
