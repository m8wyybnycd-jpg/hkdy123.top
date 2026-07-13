import { ExternalLink, Gift, Tag } from "lucide-react";
import type { Platform } from "../types";

interface PlatformCardProps {
  platform: Platform;
  onClick: () => void;
}

/**
 * Clickable cloud gaming platform card.
 * Shows name, description, price, free-tier highlights, and tags.
 * Clicking opens the PlatformModal for full details.
 */
export default function PlatformCard({ platform, onClick }: PlatformCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-game-border-hover hover:bg-game-elevated hover:shadow-card-hover"
    >
      {/* Accent glow line at top */}
      <span
        className="absolute inset-x-0 top-0 h-0.5 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(to right, ${platform.color}, transparent)`,
        }}
      />

      {/* Name + color dot */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm"
          style={{
            backgroundColor: platform.color,
            boxShadow: `0 0 0 3px ${platform.color}22`,
          }}
        />
        <h3 className="break-words text-base font-bold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
          {platform.name}
        </h3>
      </div>

      {/* Description */}
      <p className="mb-3.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-400">
        {platform.desc}
      </p>

      {/* Tags */}
      {platform.tags.length > 0 && (
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {platform.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-md bg-game-elevated px-2 py-0.5 text-xs text-slate-400"
            >
              <Tag className="h-2.5 w-2.5 text-slate-500" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="mb-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          价格
        </span>
        <p className="mt-0.5 text-sm font-semibold text-slate-200">
          {platform.price}
        </p>
      </div>

      {/* Free info */}
      <div className="mb-4 flex-1">
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
          <Gift className="h-3 w-3" /> 免费额度亮点
        </span>
        <p className="mt-0.5 line-clamp-2 break-words text-xs leading-relaxed text-slate-400">
          {platform.freeInfo}
        </p>
      </div>

      {/* Activity badge */}
      {platform.activity && (
        <div className="mb-3.5 flex items-center gap-1.5 rounded-lg border border-neon-green/20 bg-neon-green/5 px-3 py-1.5 text-xs text-neon-green">
          <Gift className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2 break-words">{platform.activity}</span>
        </div>
      )}

      {/* CTA hint */}
      <div className="flex items-center justify-center gap-1.5 rounded-lg bg-game-elevated py-2 text-sm font-medium text-slate-300 transition-colors duration-200 group-hover:bg-neon-blue/10 group-hover:text-neon-blue">
        查看详情
        <ExternalLink className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}
