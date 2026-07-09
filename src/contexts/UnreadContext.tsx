import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { apiClient } from "../services/api";
import { useAuthContext } from "./AuthContext";

/** Shape of the UnreadContext value. */
interface UnreadContextValue {
  /** Current unread message count. */
  unreadCount: number;
  /** Update unread count (supports function updater). */
  setUnreadCount: Dispatch<SetStateAction<number>>;
  /** Manually refresh unread count from the API. */
  refreshUnreadCount: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextValue | undefined>(undefined);

/**
 * UnreadProvider manages the global unread message count.
 *
 * - Fetches initial unread count on mount.
 * - Polls every 60 seconds for updates.
 * - Pauses polling when the tab is hidden (visibilitychange).
 * - Wraps ProtectedLayout so MessageBell and MessagesPage share state.
 */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { authState } = useAuthContext();

  /** Fetch the latest unread count from the API. */
  const refreshUnreadCount = useCallback(async () => {
    // Skip API call for unauthenticated users (public pages)
    if (!authState.isAuthenticated) return;
    try {
      const count = await apiClient.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail — keep current count.
    }
  }, [authState.isAuthenticated]);

  /** Start the 60s polling interval. */
  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(refreshUnreadCount, 60_000);
  }, [refreshUnreadCount]);

  /** Stop the polling interval. */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial fetch + start polling.
  useEffect(() => {
    refreshUnreadCount();
    startPolling();
    return () => stopPolling();
  }, [refreshUnreadCount, startPolling, stopPolling]);

  // Pause/resume polling based on tab visibility.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Refresh immediately when tab becomes visible, then resume polling.
        refreshUnreadCount();
        startPolling();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshUnreadCount, startPolling, stopPolling]);

  const value: UnreadContextValue = {
    unreadCount,
    setUnreadCount,
    refreshUnreadCount,
  };

  return (
    <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
  );
}

/**
 * Hook to access the shared unread count state.
 * Must be used within an UnreadProvider.
 */
export function useUnread(): UnreadContextValue {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error("useUnread must be used within an UnreadProvider");
  }
  return context;
}

export default UnreadContext;
