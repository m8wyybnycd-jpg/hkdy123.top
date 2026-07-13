import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { Wifi, WifiOff, CheckCircle2 } from "lucide-react";

/**
 * Offline/online status banner — fixed at top of screen.
 * Shows red banner when offline, green toast when connection restored.
 */
export default function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Offline: persistent red banner
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>网络已断开，部分功能不可用</span>
      </div>
    );
  }

  // Back online: temporary green toast
  if (wasOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center gap-2 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg animate-pulse">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>网络已恢复</span>
      </div>
    );
  }

  // Online and was never offline: show a subtle indicator on hover only
  return null;
}
