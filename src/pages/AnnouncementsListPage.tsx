import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, AlertTriangle, Info } from "lucide-react";
import { apiClient } from "../services/api";
import { LoadingState, ErrorState, EmptyState } from "../components/StateView";
import type { Announcement, AnnouncementType } from "../types";

/** Filter tab options. */
type TypeFilter = "all" | AnnouncementType;

interface TypeOption {
  key: TypeFilter;
  label: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { key: "all", label: "全部" },
  { key: "notice", label: "通知" },
  { key: "announcement", label: "公告" },
  { key: "maintenance", label: "维护" },
];

/** Badge styling by announcement type. */
const typeBadgeClasses: Record<AnnouncementType, string> = {
  notice: "bg-neon-blue/15 text-neon-blue",
  announcement: "bg-neon-purple/15 text-neon-purple",
  maintenance: "bg-amber-500/15 text-amber-400",
};

const typeLabels: Record<AnnouncementType, string> = {
  notice: "通知",
  announcement: "公告",
  maintenance: "维护",
};

const typeIcons: Record<AnnouncementType, React.ReactNode> = {
  notice: <Info className="h-4 w-4 text-neon-blue" />,
  announcement: <Megaphone className="h-4 w-4 text-neon-purple" />,
  maintenance: <AlertTriangle className="h-4 w-4 text-amber-400" />,
};

/**
 * Announcements archive page (route: /announcements).
 *
 * Lists all published announcements sorted by createdAt desc.
 * Filterable by type: all / notice / announcement / maintenance.
 */
export default function AnnouncementsListPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const fetchAnnouncements = useCallback(() => {
    setLoading(true);
    setError(null);
    let mounted = true;
    apiClient
      .getPublishedAnnouncements()
      .then((data) => {
        if (!mounted) return;
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setAnnouncements(sorted);
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
    const cleanup = fetchAnnouncements();
    return cleanup;
  }, [fetchAnnouncements]);

  /** Filtered announcements based on selected type. */
  const filteredAnnouncements = useMemo(() => {
    if (typeFilter === "all") return announcements;
    return announcements.filter((a) => a.type === typeFilter);
  }, [announcements, typeFilter]);

  /** Render \n as <br /> for plain-text content. */
  const renderContent = (text: string) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {i > 0 && <br />}
        {line}
      </span>
    ));

  // ── Loading ──
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Megaphone className="h-6 w-6 text-neon-purple" />
          公告中心
        </h1>
        <LoadingState lines={5} />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-slate-100">
          <Megaphone className="h-6 w-6 text-neon-purple" />
          公告中心
        </h1>
        <ErrorState message={error} onRetry={fetchAnnouncements} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-slate-100">
        <Megaphone className="h-6 w-6 text-neon-purple" />
        公告中心
      </h1>

      {/* Type filter tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-game-card/60 p-1">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setTypeFilter(opt.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              typeFilter === opt.key
                ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Empty */}
      {filteredAnnouncements.length === 0 && (
        <EmptyState message="暂无公告" />
      )}

      {/* Announcement cards */}
      {filteredAnnouncements.length > 0 && (
        <div className="space-y-3">
          {filteredAnnouncements.map((ann) => {
            const type = ann.type as AnnouncementType;
            return (
              <div
                key={ann.id}
                className="rounded-2xl border border-game-border bg-game-card p-4 transition-all duration-200 hover:border-slate-700"
              >
                <div className="mb-2 flex items-center gap-2">
                  {/* Type icon + badge */}
                  <span className="shrink-0">{typeIcons[type]}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      typeBadgeClasses[type]
                    }`}
                  >
                    {typeLabels[type]}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-slate-200">
                  {ann.title}
                </h3>

                {/* Content */}
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {renderContent(ann.content)}
                </p>

                {/* Timestamp */}
                <p className="mt-3 text-xs text-slate-600">
                  发布时间：
                  {ann.publishedAt
                    ? new Date(ann.publishedAt).toLocaleString("zh-CN")
                    : new Date(ann.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
