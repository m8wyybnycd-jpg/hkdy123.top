import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronUp, Megaphone } from "lucide-react";
import { apiClient } from "../services/api";
import type { Announcement } from "../types";

/**
 * Global announcement bar rendered below the Header in ProtectedLayout.
 *
 * Fetches published announcements from the API and displays the most recent one.
 * - maintenance type: amber warning banner
 * - other types: neon-blue info banner
 * - Expandable content area with ChevronDown/ChevronUp toggle.
 * - "查看全部" link to /announcements.
 * - Returns null (zero height) when no announcements exist.
 */
export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [expanded, setExpanded] = useState(false);
  let mounted = true;

  useEffect(() => {
    mounted = true;
    apiClient
      .getPublishedAnnouncements()
      .then((data) => {
        if (mounted) setAnnouncements(data);
      })
      .catch(() => {
        if (mounted) setAnnouncements([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // No published announcements → render nothing.
  if (announcements.length === 0) return null;

  // Show the most recent (first) announcement.
  const current = announcements[0];
  const isMaintenance = current.type === "maintenance";

  /** Render \n as <br /> for plain-text content. */
  const renderContent = (text: string) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {i > 0 && <br />}
        {line}
      </span>
    ));

  return (
    <div
      className={`border-b px-4 py-2.5 ${
        isMaintenance
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-neon-blue/10 border-neon-blue/20"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-2 sm:px-6">
        {/* Left: icon + title */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {isMaintenance ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          ) : (
            <Megaphone className="h-4 w-4 shrink-0 text-neon-blue" />
          )}
          <span
            className={`truncate text-sm font-medium ${
              isMaintenance ? "text-amber-300" : "text-neon-blue"
            }`}
          >
            {current.title}
          </span>
          {/* Type badge */}
          <span
            className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold sm:inline ${
              isMaintenance
                ? "bg-amber-500/20 text-amber-300"
                : "bg-neon-blue/20 text-neon-blue"
            }`}
          >
            {current.type === "maintenance"
              ? "维护"
              : current.type === "notice"
                ? "通知"
                : "公告"}
          </span>
        </div>

        {/* Right: expand toggle + view all */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            aria-label={expanded ? "收起公告" : "展开公告"}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {expanded ? "收起" : "展开"}
            </span>
          </button>
          <NavLink
            to="/announcements"
            className="rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-neon-blue"
          >
            查看全部
          </NavLink>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mx-auto mt-2 max-h-60 max-w-6xl overflow-y-auto rounded-lg bg-black/20 px-4 py-3 sm:px-6">
          <p className="text-sm leading-relaxed text-slate-300">
            {renderContent(current.content)}
          </p>
          {current.publishedAt && (
            <p className="mt-2 text-xs text-slate-500">
              {new Date(current.publishedAt).toLocaleString("zh-CN")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
