import { Filter, Star, X } from "lucide-react";
import type { Config, GameType, PlatformId } from "../types";
import { ALL_CONFIGS, ALL_GAME_TYPES } from "../types";
import { platforms } from "../data/platforms";

interface FilterBarProps {
  selectedType: GameType | "全部";
  onTypeChange: (type: GameType | "全部") => void;
  selectedPlatforms: PlatformId[];
  onPlatformToggle: (id: PlatformId) => void;
  selectedConfig: Config | "all";
  onConfigChange: (config: Config | "all") => void;
  sortByRating: boolean;
  onSortToggle: () => void;
  resultCount: number;
}

/**
 * Multi-dimensional filter bar: genre, platform (multi-select),
 * config requirement, and rating sort toggle.
 */
export default function FilterBar({
  selectedType,
  onTypeChange,
  selectedPlatforms,
  onPlatformToggle,
  selectedConfig,
  onConfigChange,
  sortByRating,
  onSortToggle,
  resultCount,
}: FilterBarProps) {
  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-game-border bg-game-card/60 p-4 backdrop-blur-xl">
      {/* Genre filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-sm font-medium text-slate-400">
          <Filter className="h-3.5 w-3.5" /> 类型
        </span>
        {ALL_GAME_TYPES.map((type) => {
          const active = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-blue/20"
                  : "border border-game-border bg-game-darker/50 text-slate-400 hover:border-game-border-hover hover:text-slate-200"
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Platform filter (multi-select) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-400">平台</span>
        {platforms.map((p) => {
          const active = selectedPlatforms.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onPlatformToggle(p.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "text-white shadow-md"
                  : "border border-game-border bg-game-darker/50 text-slate-400 hover:border-game-border-hover hover:text-slate-200"
              }`}
              style={
                active
                  ? { backgroundColor: p.color, borderColor: p.color }
                  : undefined
              }
            >
              {p.name}
            </button>
          );
        })}
        {selectedPlatforms.length > 0 && (
          <button
            onClick={() => selectedPlatforms.forEach(onPlatformToggle)}
            className="ml-1 flex items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <X className="h-3 w-3" /> 清除
          </button>
        )}
      </div>

      {/* Config filter + Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-game-border pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium text-slate-400">配置</span>
          {ALL_CONFIGS.map((c) => {
            const active = selectedConfig === c.value;
            return (
              <button
                key={c.value}
                onClick={() => onConfigChange(c.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-game-darker shadow-md"
                    : "border border-game-border bg-game-darker/50 text-slate-400 hover:border-game-border-hover hover:text-slate-200"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            共 <span className="font-medium text-slate-300">{resultCount}</span> 款
          </span>
          <button
            onClick={onSortToggle}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              sortByRating
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                : "border border-game-border bg-game-darker/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Star
              className={`h-3.5 w-3.5 ${sortByRating ? "fill-amber-400 text-amber-400" : ""}`}
            />
            评分{sortByRating ? " ↓" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
