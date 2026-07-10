import { useState } from "react";
import { Star, Cpu } from "lucide-react";
import type { Config, Game, GameType, Platform } from "../types";
import { platformMap } from "../data/platforms";

interface GameCardProps {
  game: Game;
  platforms: Platform[];
  onClick: () => void;
}

/** Tailwind gradient classes per game type for the cover — softened, more harmonious. */
const typeGradients: Record<GameType, string> = {
  "3A大作": "from-violet-600/90 via-purple-700/90 to-indigo-900/90",
  MOBA: "from-cyan-500/90 via-blue-600/90 to-blue-900/90",
  "FPS射击": "from-orange-500/90 via-red-600/90 to-rose-900/90",
  "动作RPG": "from-red-500/90 via-orange-600/90 to-amber-900/90",
  策略: "from-emerald-500/90 via-teal-600/90 to-green-900/90",
  休闲: "from-pink-400/90 via-rose-500/90 to-pink-800/90",
  独立: "from-teal-400/90 via-cyan-600/90 to-purple-800/90",
  模拟经营: "from-amber-400/90 via-yellow-600/90 to-lime-800/90",
  格斗: "from-red-600/90 via-rose-700/90 to-slate-900/90",
  生存: "from-green-600/90 via-emerald-700/90 to-teal-900/90",
  竞速: "from-blue-400/90 via-sky-600/90 to-cyan-900/90",
  卡牌: "from-purple-400/90 via-violet-600/90 to-fuchsia-900/90",
};

/** Config badge styling. */
const configStyles: Record<Config, { label: string; className: string }> = {
  low: {
    label: "低配",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  mid: {
    label: "中配",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  high: {
    label: "高配",
    className: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

/**
 * Game card with gradient cover, emoji, name, rating, config badge,
 * and supported-platform chips. Hover lifts the card with a soft border highlight.
 */
export default function GameCard({ game, platforms, onClick }: GameCardProps) {
  const gradient = typeGradients[game.type];
  const [imgError, setImgError] = useState(false);
  const showCover = Boolean(game.cover) && !imgError;
  const configBadge = configStyles[game.config];
  const gamePlatforms = game.platforms
    .map((id) => platformMap[id])
    .filter((p): p is Platform => p !== undefined);

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-game-border-hover hover:shadow-card-hover"
    >
      {/* Cover */}
      <div
        className={`relative flex h-36 items-center justify-center overflow-hidden ${
          showCover ? "bg-game-darker" : `bg-gradient-to-br ${gradient}`
        }`}
      >
        {showCover ? (
          <>
            <img
              src={game.cover}
              alt={game.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="relative text-5xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
              {game.emoji}
            </span>
          </>
        )}
        {/* Type chip on cover */}
        <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white/90 backdrop-blur-md">
          {game.type}
        </span>
        {/* Rating on cover */}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold text-amber-400 backdrop-blur-md">
          <Star className="h-3 w-3 fill-amber-400" />
          {game.rating.toFixed(1)}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="text-base font-semibold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
          {game.name}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {game.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-game-elevated px-2 py-0.5 text-xs text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Config badge */}
        <div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${configBadge.className}`}
          >
            <Cpu className="h-3 w-3" />
            {configBadge.label}
          </span>
        </div>

        {/* Platform chips */}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {gamePlatforms.map((p) => (
            <span
              key={p.id}
              className="rounded px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${p.color}1a`,
                color: p.color,
                border: `1px solid ${p.color}33`,
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
