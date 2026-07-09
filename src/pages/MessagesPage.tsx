import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { apiClient } from "../services/api";
import { useUnread } from "../contexts/UnreadContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateView";
import type { Message } from "../types";

/** Tab options for message filtering. */
type FilterTab = "all" | "unread" | "read";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "read", label: "已读" },
];

/**
 * User messages page (route: /messages).
 *
 * - Lists all personal + broadcast messages sorted by createdAt desc.
 * - Unread messages show a blue dot and bold title.
 * - Click expands details and marks as read.
 * - Top tab bar filters by all / unread / read.
 */
export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const { setUnreadCount } = useUnread();

  /** Fetch messages from the API. */
  const fetchMessages = useCallback(() => {
    setLoading(true);
    setError(null);
    let mounted = true;
    apiClient
      .getMyMessages()
      .then((data) => {
        if (!mounted) return;
        // Sort by createdAt descending.
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMessages(sorted);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || "加载失败");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchMessages();
    return cleanup;
  }, [fetchMessages]);

  /** Toggle expand/collapse; mark as read on expand if currently unread. */
  const handleToggle = useCallback(
    async (msg: Message) => {
      const isCurrentlyExpanded = expandedId === msg.id;

      if (isCurrentlyExpanded) {
        setExpandedId(null);
        return;
      }

      setExpandedId(msg.id);

      // Mark as read if unread.
      if (msg.isRead === 0) {
        try {
          await apiClient.markMessageRead(msg.id);
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, isRead: 1 } : m))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
          // Silently fail — message still appears expanded.
        }
      }
    },
    [expandedId, setUnreadCount]
  );

  /** Filtered messages based on active tab. */
  const filteredMessages = useMemo(() => {
    if (filterTab === "all") return messages;
    if (filterTab === "unread") return messages.filter((m) => m.isRead === 0);
    return messages.filter((m) => m.isRead === 1);
  }, [messages, filterTab]);

  /** Render \n as <br /> for plain-text content. */
  const renderContent = (text: string) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {i > 0 && <br />}
        {line}
      </span>
    ));

  // ── Loading State ──
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-100">📬 我的消息</h1>
        <LoadingState lines={5} />
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-100">📬 我的消息</h1>
        <ErrorState message={error} onRetry={fetchMessages} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <h1 className="mb-6 text-2xl font-bold text-slate-100">📬 我的消息</h1>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-game-card/60 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilterTab(tab.key);
              setExpandedId(null);
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              filterTab === tab.key
                ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredMessages.length === 0 && (
        <EmptyState
          message={filterTab !== "all" ? `暂无${TABS.find((t) => t.key === filterTab)?.label}消息` : "暂无消息"}
        />
      )}

      {/* Message list */}
      {filteredMessages.length > 0 && (
        <div className="space-y-3">
          {filteredMessages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const isUnread = msg.isRead === 0;
            const isBroadcast = msg.recipientId === -1;

            return (
              <div
                key={msg.id}
                className="overflow-hidden rounded-2xl border border-game-border bg-game-card transition-all duration-200 hover:border-slate-700"
              >
                {/* Message row */}
                <button
                  onClick={() => handleToggle(msg)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                >
                  {/* Unread dot */}
                  <div className="mt-2 shrink-0">
                    {isUnread && (
                      <span className="block h-2 w-2 rounded-full bg-neon-blue" />
                    )}
                    {!isUnread && <span className="block h-2 w-2" />}
                  </div>

                  {/* Message meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {/* System / Personal label */}
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          isBroadcast
                            ? "bg-neon-purple/15 text-neon-purple"
                            : "bg-neon-green/15 text-neon-green"
                        }`}
                      >
                        {isBroadcast ? "[系统]" : "[个人]"}
                      </span>
                      <span
                        className={`truncate text-sm ${
                          isUnread
                            ? "font-semibold text-slate-200"
                            : "text-slate-400"
                        }`}
                      >
                        {msg.title}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {msg.content}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {new Date(msg.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  {/* Right: read status + expand arrow */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-xs ${
                        isUnread ? "text-neon-blue" : "text-slate-500"
                      }`}
                    >
                      {isUnread ? "未读" : "已读"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <div className="border-t border-game-border px-4 py-3">
                    <p className="text-sm leading-relaxed text-slate-300">
                      {renderContent(msg.content)}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      发送时间：{new Date(msg.createdAt).toLocaleString("zh-CN")}
                    </p>
                    {msg.readAt && (
                      <p className="text-xs text-slate-600">
                        已读时间：{new Date(msg.readAt).toLocaleString("zh-CN")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
