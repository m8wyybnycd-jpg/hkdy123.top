import { ExternalLink, Clock, Tag, Calendar } from "lucide-react";
import type { Deal } from "../types";
import { DEAL_CATEGORIES } from "../types";
import { useExternalLink } from "../hooks/useExternalLink";

interface DealCardProps {
  deal: Deal;
}

/** Find the label for a deal category. */
function getCategoryLabel(category: string): string {
  const found = DEAL_CATEGORIES.find((c) => c.value === category);
  return found?.label ?? category;
}

/** Check if a deal has expired. */
function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/** Format a date string for display. */
function formatDate(dateStr: string): string {
  if (!dateStr) return "未知";
  try {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  } catch {
    return dateStr;
  }
}

/**
 * Deal card with title, description, tags, update/expiry dates,
 * and direct link. Expired deals are visually greyed out.
 */
export default function DealCard({ deal }: DealCardProps) {
  const { openExternal } = useExternalLink();
  const expired = isExpired(deal.expiresAt);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card p-5 shadow-card transition-all duration-300 hover:border-game-border-hover hover:bg-game-elevated hover:shadow-card-hover ${
        expired ? "opacity-50 grayscale" : ""
      }`}
    >
      {/* Category badge + expired tag */}
      <div className="mb-2.5 flex items-center gap-2">
        <span className="rounded-md bg-neon-purple/15 px-2 py-0.5 text-xs font-medium text-neon-purple ring-1 ring-neon-purple/20">
          {getCategoryLabel(deal.category)}
        </span>
        {expired && (
          <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400 ring-1 ring-red-500/20">
            已过期
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 line-clamp-2 break-words text-base font-bold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
        {deal.title}
      </h3>

      {/* Description */}
      <p className="mb-3.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-400">
        {deal.description}
      </p>

      {/* Tags */}
      {deal.tags.length > 0 && (
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {deal.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded bg-game-elevated px-2 py-0.5 text-xs text-slate-400"
            >
              <Tag className="h-2.5 w-2.5 text-slate-500" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Dates */}
      <div className="mb-3.5 flex flex-wrap gap-4 border-t border-game-border pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          更新：{formatDate(deal.updatedAt)}
        </span>
        {deal.expiresAt && (
          <span
            className={`flex items-center gap-1 ${expired ? "text-red-400" : ""}`}
          >
            <Clock className="h-3 w-3" />
            有效期至：{formatDate(deal.expiresAt)}
          </span>
        )}
        {!deal.expiresAt && (
          <span className="flex items-center gap-1 text-neon-green">
            <Clock className="h-3 w-3" />
            长期有效
          </span>
        )}
      </div>

      {/* Link */}
      <button
        type="button"
        onClick={() => openExternal(deal.link)}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-game-elevated py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-neon-blue/10 hover:text-neon-blue"
      >
        直达链接
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
