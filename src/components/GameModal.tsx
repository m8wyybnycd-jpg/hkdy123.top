import { useEffect, useState, useRef } from "react";
import {
  X,
  Star,
  Cpu,
  ExternalLink,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import type { Config, Game, Platform } from "../types";
import { platformMap } from "../data/platforms";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useExternalLink } from "../hooks/useExternalLink";

interface GameModalProps {
  game: Game;
  platforms: Platform[];
  onClose: () => void;
}

/** Config badge styling (mirrors GameCard). */
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
 * Full-screen modal with game details: description, supported platforms
 * with pricing and "go play" buttons, and recommendation reason.
 * Closes on ESC, backdrop click, or close button.
 */
export default function GameModal({ game, platforms, onClose }: GameModalProps) {
  const [coverError, setCoverError] = useState(false);
  const showCover = Boolean(game.cover) && !coverError;
  const containerRef = useRef<HTMLDivElement>(null);
  const { openExternal } = useExternalLink();

  useFocusTrap(containerRef, true, onClose);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const configBadge = configStyles[game.config];
  const gamePlatforms = game.platforms
    .map((id) => platformMap[id])
    .filter((p): p is Platform => p !== undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={game.name}
        className="relative my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-game-border bg-game-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-game-elevated/80 text-slate-400 backdrop-blur-sm transition-all duration-200 hover:bg-game-border-hover hover:text-white"
          aria-label="关闭"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Cover banner (when Steam header image is available) */}
        {showCover && (
          <div className="relative h-40 overflow-hidden bg-game-darker">
            <img
              src={game.cover}
              alt={game.name}
              className="h-full w-full object-cover"
              onError={() => setCoverError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-game-card via-game-card/40 to-transparent" />
            <span className="absolute left-4 top-4 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white/90 backdrop-blur-md">
              {game.type}
            </span>
          </div>
        )}

        {/* Header section */}
        <div
          className={`flex items-center gap-4 border-b border-game-border p-6 pb-5 ${
            showCover ? "pt-5" : ""
          }`}
        >
          {!showCover && (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 text-5xl ring-1 ring-game-border">
              {game.emoji}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-slate-100">{game.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-game-elevated px-2 py-0.5 text-xs font-medium text-slate-300">
                {game.type}
              </span>
              <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
                <Star className="h-4 w-4 fill-amber-400" />
                {game.rating.toFixed(1)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${configBadge.className}`}
              >
                <Cpu className="h-3 w-3" />
                {configBadge.label}
              </span>
            </div>
            {/* Tags */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-game-elevated/60 px-2 py-0.5 text-xs text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Description */}
          <div>
            <h3 className="mb-1.5 text-sm font-semibold text-slate-300">
              游戏简介
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">{game.desc}</p>
          </div>

          {/* Platforms */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-neon-green" />
              在哪些平台能玩
            </h3>
            <div className="space-y-2">
              {gamePlatforms.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-game-border bg-game-darker/50 p-3 transition-colors hover:border-game-border-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: p.color,
                          boxShadow: `0 0 0 3px ${p.color}22`,
                        }}
                      />
                      <span className="font-medium text-slate-200">
                        {p.name}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-5 text-xs text-slate-500">{p.price}</p>
                  </div>
                  <button
                    onClick={() => openExternal(p.url)}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:brightness-110"
                    style={{
                      backgroundColor: p.color,
                      boxShadow: `0 4px 12px -4px ${p.color}55`,
                    }}
                  >
                    去玩
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-xl border border-neon-purple/20 bg-neon-purple/5 p-4">
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-neon-purple">
              <Lightbulb className="h-4 w-4" />
              推荐理由
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">
              {game.reason}
            </p>
          </div>

          <p className="text-center text-xs text-slate-500">
            平台支持信息以各官网实时为准
          </p>
        </div>
      </div>
    </div>
  );
}
