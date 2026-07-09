import { useCallback, useEffect, useMemo, useState, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { X, Megaphone, Info, Wrench } from "lucide-react";
import { apiClient } from "../services/api";
import type { Announcement, AnnouncementType } from "../types";
import { useFocusTrap } from "../hooks/useFocusTrap";

/** localStorage key tracking seen announcement IDs. */
const SEEN_KEY = "cloudgame_seen_announcements";

/**
 * Read the set of seen announcement IDs from localStorage.
 *
 * @returns Array of seen announcement IDs.
 */
function getSeenIds(): number[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "number");
  } catch {
    return [];
  }
}

/**
 * Append an announcement ID to the seen list in localStorage.
 *
 * @param id - The announcement ID to mark as seen.
 */
function markSeen(id: number): void {
  try {
    const seen = getSeenIds();
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    }
  } catch {
    // localStorage might be unavailable (private mode); silently ignore.
  }
}

/** Type-to-display-label mapping for announcement type badges. */
const TYPE_LABELS: Record<AnnouncementType, string> = {
  announcement: "公告",
  notice: "通知",
  maintenance: "维护",
};

/** Type-to-styling mapping for announcement type badges. */
const TYPE_STYLES: Record<
  AnnouncementType,
  { badge: string; icon: string; ring: string }
> = {
  announcement: {
    badge: "bg-neon-blue/20 text-neon-blue",
    icon: "text-neon-blue",
    ring: "ring-neon-blue/30",
  },
  notice: {
    badge: "bg-neon-purple/20 text-neon-purple",
    icon: "text-neon-purple",
    ring: "ring-neon-purple/30",
  },
  maintenance: {
    badge: "bg-amber-500/20 text-amber-400",
    icon: "text-amber-400",
    ring: "ring-amber-500/30",
  },
};

/** Type-to-icon mapping. */
const TYPE_ICONS: Record<AnnouncementType, typeof Megaphone> = {
  announcement: Megaphone,
  notice: Info,
  maintenance: Wrench,
};

/**
 * Announcement auto-popup Modal.
 *
 * - On mount, fetches published announcements.
 * - Finds the first announcement the user hasn't seen (tracked via localStorage).
 * - Displays it in a centered modal with backdrop blur.
 * - Dismissal (button, close, or backdrop click) records the ID as seen.
 * - Renders via createPortal to document.body to avoid z-index issues.
 * - If all announcements are already seen, renders nothing.
 */
export default function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  /** Fetch announcements and determine which to show. */
  useEffect(() => {
    let cancelled = false;

    const loadAnnouncement = async (): Promise<void> => {
      try {
        const announcements = await apiClient.getPublishedAnnouncements();
        if (cancelled || announcements.length === 0) return;

        const seenIds = getSeenIds();

        // Find the first unseen announcement (API returns sorted list).
        const unseen = announcements.find((a) => !seenIds.includes(a.id));

        if (unseen && !cancelled) {
          setAnnouncement(unseen);
          // Small delay for a smooth entrance.
          requestAnimationFrame(() => {
            if (!cancelled) setVisible(true);
          });
        }
      } catch {
        // Silently fail — modal is non-critical.
      }
    };

    loadAnnouncement();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Close the modal and mark the announcement as seen. */
  const handleClose = useCallback((): void => {
    setVisible(false);
    if (announcement) {
      markSeen(announcement.id);
    }
    // Clear announcement after the fade-out transition.
    setTimeout(() => setAnnouncement(null), 200);
  }, [announcement]);

  /** Handle backdrop click — only close if clicking the backdrop itself. */
  const handleBackdropClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>): void => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  /** Handle Escape key to close. */
  useFocusTrap(containerRef, visible, handleClose);

  // Memoize derived display values.
  const typeInfo = useMemo(() => {
    if (!announcement) return null;
    const type = announcement.type as AnnouncementType;
    const Icon = TYPE_ICONS[type] ?? Megaphone;
    return {
      type,
      label: TYPE_LABELS[type] ?? "公告",
      styles: TYPE_STYLES[type] ?? TYPE_STYLES.announcement,
      Icon,
    };
  }, [announcement]);

  // Render nothing if no announcement to show.
  if (!announcement || !typeInfo) return null;

  const { label, styles, Icon } = typeInfo;

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      } bg-black/60 backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      {/* Modal card */}
      <div
        ref={containerRef}
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-game-border bg-game-card shadow-2xl ring-1 ${styles.ring} transition-transform duration-200 ${
          visible ? "scale-100" : "scale-95"
        }`}
      >
        {/* Top bar: type badge + close button */}
        <div className="flex items-center justify-between border-b border-game-border/50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${styles.icon}`} />
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${styles.badge}`}
            >
              {label}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body: title + content */}
        <div className="px-5 py-4">
          <h2
            id="announcement-modal-title"
            className="text-xl font-bold text-slate-100"
          >
            {announcement.title}
          </h2>
          <div className="mt-3 max-h-60 overflow-y-auto">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
              {announcement.content}
            </p>
          </div>
        </div>

        {/* Footer: publish time + confirm button */}
        <div className="flex items-center justify-between border-t border-game-border/50 px-5 py-3.5">
          <span className="text-xs text-slate-500">
            {announcement.publishedAt
              ? new Date(announcement.publishedAt).toLocaleString("zh-CN")
              : new Date(announcement.updatedAt).toLocaleString("zh-CN")}
          </span>
          <button
            onClick={handleClose}
            className="rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple px-5 py-2 text-sm font-medium text-white shadow-lg shadow-neon-blue/20 transition-all duration-200 hover:shadow-neon-blue/40 hover:brightness-110 active:scale-95"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
