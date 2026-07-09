import { useAuthContext } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Custom hook for opening external links with authentication check.
 *
 * If the user is not authenticated, redirects to the login page instead
 * of opening the external URL. This ensures all outbound links require
 * a logged-in session.
 *
 * @returns An object with `openExternal` function and `isAuthenticated` flag.
 */
export function useExternalLink(): {
  openExternal: (url: string) => void;
  isAuthenticated: boolean;
} {
  const { authState } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Open an external URL in a new tab after verifying the user is logged in.
   * Redirects to /login if not authenticated, preserving the current location
   * so the user can be redirected back after login.
   *
   * @param url - The external URL to open.
   */
  const openExternal = (url: string): void => {
    if (!authState.isAuthenticated) {
      navigate("/login", {
        state: {
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        },
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return { openExternal, isAuthenticated: authState.isAuthenticated };
}
