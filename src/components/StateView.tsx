import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

/** Props for the LoadingState skeleton component. */
interface LoadingStateProps {
  /** Number of skeleton rows (default: 3). */
  lines?: number;
  /** Additional CSS class names. */
  className?: string;
}

/** Props for the ErrorState retry component. */
interface ErrorStateProps {
  /** Error message displayed to user (defaults to generic text). */
  message?: string;
  /** Callback when user clicks retry button. */
  onRetry: () => void;
}

/** Props for the EmptyState placeholder component. */
interface EmptyStateProps {
  /** Descriptive text for the empty state (defaults to "暂无数据"). */
  message?: string;
  /** Custom icon element (defaults to Inbox icon). */
  icon?: ReactNode;
}

/**
 * Skeleton screen with configurable number of shimmer lines.
 * Each line has random width (60%-100%) for a natural look.
 */
export function LoadingState({ lines = 3, className = "" }: LoadingStateProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => {
        const width = 60 + Math.floor(Math.random() * 40); // 60%-100%
        return (
          <div
            key={i}
            className="h-4 rounded bg-slate-700/50 animate-pulse"
            style={{ width: `${width}%` }}
          />
        );
      })}
    </div>
  );
}

/**
 * Error display with alert icon, message, and retry button.
 */
export function ErrorState({
  message = "加载失败，请稍后重试",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <p className="text-base text-slate-300">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple px-6 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
      >
        重试
      </button>
    </div>
  );
}

/**
 * Empty state placeholder with icon and message.
 */
export function EmptyState({
  message = "暂无数据",
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-game-elevated">
        {icon ?? <Inbox className="h-7 w-7 text-slate-500" />}
      </div>
      <p className="text-base text-slate-400">{message}</p>
    </div>
  );
}
