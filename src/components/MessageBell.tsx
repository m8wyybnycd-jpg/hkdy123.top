import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUnread } from "../contexts/UnreadContext";
import { apiClient } from "../services/api";
import type { Message } from "../types";

/**
 * Format a relative time string from an ISO timestamp.
 *
 * Examples: "刚刚", "5分钟前", "2小时前", "昨天", "3天前".
 *
 * @param iso - ISO 8601 timestamp string.
 * @returns Human-readable relative time in Chinese.
 */
function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  if (diff < 0) return "刚刚";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return "昨天";
  if (days < 30) return `${days}天前`;

  // Fall back to date for older messages.
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if needed.
 *
 * @param text - The input string.
 * @param maxLen - Maximum character length.
 * @returns Truncated string.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

/** Loading skeleton row count. */
const SKELETON_ROWS = 3;

/** Maximum number of preview messages to show. */
const MAX_PREVIEW = 5;

/**
 * Message notification bell with dropdown panel.
 *
 * - Click toggles a dropdown panel showing the latest 5 messages.
 * - Panel shows unread badge, relative timestamps, and skeleton loading.
 * - Clicking outside closes the panel.
 * - "查看全部消息" link navigates to /messages.
 * - Consumes UnreadContext for live unread count updates.
 */
export default function MessageBell() {
  const { unreadCount, refreshUnreadCount } = useUnread();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  /** Badge display text (shows "99+" for large counts). */
  const badgeText =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  /** Fetch the latest messages for the dropdown panel. */
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getMyMessages();
      setMessages(data.slice(0, MAX_PREVIEW));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Toggle the dropdown panel open/closed. */
  const togglePanel = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      // Fetch messages when opening (only if not already fetched).
      if (next && !fetchedRef.current) {
        fetchedRef.current = true;
        fetchMessages();
      }
      return next;
    });
  }, [fetchMessages]);

  /** Close the panel and navigate to full messages page. */
  const handleViewAll = useCallback(() => {
    setOpen(false);
    navigate("/messages");
  }, [navigate]);

  /** Close panel when clicking outside the container. */
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    // Use setTimeout to avoid catching the click that opened the panel.
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  /** Close panel on Escape key. */
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  /** Refresh unread count when panel closes (to sync any reads). */
  useEffect(() => {
    if (!open) {
      refreshUnreadCount();
    }
  }, [open, refreshUnreadCount]);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={togglePanel}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-game-border bg-game-card/60 text-slate-400 transition-all duration-200 hover:border-neon-blue/30 hover:bg-neon-blue/10 hover:text-neon-blue"
        aria-label={`消息通知${badgeText ? `，${badgeText}条未读` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4.5 w-4.5" />
        {badgeText && (
          <span className="absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-game-border bg-game-card shadow-xl sm:w-80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-game-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-neon-blue" />
              <span className="text-sm font-semibold text-slate-200">
                我的消息
              </span>
            </div>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                {unreadCount} 条未读
              </span>
            )}
          </div>

          {/* Message list */}
          <div className="max-h-80 overflow-y-auto">
            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-2 p-3">
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg p-2"
                  >
                    <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-slate-600" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-600/70" />
                      <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-700" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-400">{error}</p>
                <button
                  onClick={() => {
                    fetchedRef.current = false;
                    fetchMessages();
                  }}
                  className="mt-2 text-xs text-neon-blue hover:underline"
                >
                  重试
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && messages.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">暂无消息</p>
              </div>
            )}

            {/* Message items */}
            {!loading &&
              !error &&
              messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={handleViewAll}
                  className="flex w-full items-start gap-2.5 border-b border-game-border/50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {msg.isRead === 0 ? (
                      <span className="block h-2 w-2 rounded-full bg-neon-blue" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          msg.isRead === 0
                            ? "font-medium text-slate-200"
                            : "text-slate-400"
                        }`}
                      >
                        {truncate(msg.title, 20)}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {truncate(msg.content, 30)}
                    </p>
                  </div>
                </button>
              ))}
          </div>

          {/* Footer: view all */}
          <button
            onClick={handleViewAll}
            className="flex w-full items-center justify-center gap-1 border-t border-game-border px-4 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-neon-blue"
          >
            查看全部消息
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
