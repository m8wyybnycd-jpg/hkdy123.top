import { useAuthContext } from "../contexts/AuthContext";
import type { AuthContextValue } from "../types";

/**
 * Convenience hook to access the auth context.
 * Re-exports useAuthContext for ergonomic imports.
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}

export default useAuth;
