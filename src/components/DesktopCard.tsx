import { ExternalLink, Monitor, Coins, Activity } from "lucide-react";
import type { CloudDesktop } from "../types";
import { useExternalLink } from "../hooks/useExternalLink";

interface DesktopCardProps {
  desktop: CloudDesktop;
}

/**
 * Office cloud desktop card.
 * Shows name, description, scenarios, price range, and activity.
 */
export default function DesktopCard({ desktop }: DesktopCardProps) {
  const { openExternal } = useExternalLink();

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-game-border-hover hover:bg-game-elevated hover:shadow-card-hover">
      {/* Accent line */}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-neon-blue/60 via-neon-purple/40 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Header */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neon-blue/15 to-neon-purple/15 ring-1 ring-neon-blue/20">
          <Monitor className="h-5 w-5 text-neon-blue" />
        </div>
        <h3 className="break-words text-base font-bold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
          {desktop.name}
        </h3>
      </div>

      {/* Description */}
      <p className="mb-3.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-400">
        {desktop.desc}
      </p>

      {/* Scenarios */}
      <div className="mb-3.5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          适用场景
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {desktop.scenarios.map((scenario) => (
            <span
              key={scenario}
              className="rounded-md bg-game-elevated px-2 py-0.5 text-xs text-slate-300"
            >
              {scenario}
            </span>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="mb-2.5">
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          <Coins className="h-3 w-3" /> 价格区间
        </span>
        <p className="mt-0.5 text-sm font-semibold text-slate-200">
          {desktop.priceRange}
        </p>
      </div>

      {/* Activity */}
      {desktop.activity && (
        <div className="mb-4 flex-1">
          <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Activity className="h-3 w-3" /> 活动
          </span>
          <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-neon-green/20 bg-neon-green/5 px-2.5 py-1.5">
            <span>🎁</span>
            <p className="line-clamp-2 break-words text-xs leading-relaxed text-neon-green">
              {desktop.activity}
            </p>
          </div>
        </div>
      )}

      {!desktop.activity && <div className="flex-1" />}

      {/* Go to site */}
      <button
        type="button"
        onClick={() => openExternal(desktop.url)}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple py-2.5 text-sm font-semibold text-white shadow-lg shadow-neon-blue/20 transition-all duration-200 hover:shadow-glow hover:brightness-110"
      >
        进入官网
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
