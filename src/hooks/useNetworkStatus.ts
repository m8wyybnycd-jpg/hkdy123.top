import { useEffect, useState } from "react";

/**
 * Network status hook — tracks online/offline state.
 * Listens to browser `online` and `offline` events.
 * Returns `{ isOnline, wasOffline }` — `wasOffline` is true when
 * the connection was lost and is now restored (for "back online" toasts).
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Reset wasOffline after 4 seconds so the "back online" toast fades
      setTimeout(() => setWasOffline(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
