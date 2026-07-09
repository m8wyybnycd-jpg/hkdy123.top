import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuthContext } from "./AuthContext";

/** Permission context value exposed to consumers. */
interface PermissionContextValue {
  /** Array of permission code strings from JWT. */
  permissions: string[];
  /** Array of role code strings from JWT. */
  roles: string[];
  /** Check if the user has a specific permission. */
  hasPermission: (code: string) => boolean;
  /** Check if the user has any of the specified permissions. */
  hasAnyPermission: (codes: string[]) => boolean;
  /** Whether the user is a super admin. */
  isSuperAdmin: boolean;
}

/** Permission context with a default no-op implementation. */
const PermissionContext = createContext<PermissionContextValue | undefined>(
  undefined
);

/**
 * PermissionProvider provides permission-checking utilities based on
 * the JWT-stored permissions and roles from AuthContext.
 *
 * This uses JWT-cached permissions (not real-time D1 queries) for
 * route guarding and menu filtering. Security is enforced server-side.
 */
export function PermissionProvider({ children }: { children: ReactNode }) {
  const { authState } = useAuthContext();

  const value = useMemo<PermissionContextValue>(() => {
    const permissions = authState.user?.permissions ?? [];
    const roles = authState.user?.roles ?? [];

    return {
      permissions,
      roles,
      hasPermission: (code: string): boolean => permissions.includes(code),
      hasAnyPermission: (codes: string[]): boolean =>
        codes.some((code) => permissions.includes(code)),
      isSuperAdmin: roles.includes("super_admin"),
    };
  }, [authState.user]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/** Hook to access the permission context. Throws if used outside PermissionProvider. */
export function usePermission(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
}

export default PermissionContext;
