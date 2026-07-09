import { useEffect, useRef } from "react";
import {
  X,
  ExternalLink,
  Gift,
  Tag,
  Activity,
  Coins,
} from "lucide-react";
import type { Platform } from "../types";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface PlatformModalProps {
  platform: Platform;
  onClose: () => void;
}

/**
 * Full-screen modal with platform details:
 * name, description, tags, price, free-tier highlights, activity,
 * and official website link.
 *
 * Closes on ESC, backdrop click, or close button.
 */
export default function PlatformModal({ platform, onClose }: PlatformModalProps) {
  const containerRef = useRef<HTMLElement>(null);

  useFocusTrap(containerRef, true, onClose);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={platform.name}
        className="relative my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-game-border bg-game-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent header bar */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: platform.color }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-game-elevated text-slate-400 transition-all duration-200 hover:bg-game-border-hover hover:text-white"
          aria-label="关闭"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="border-b border-game-border p-6 pb-5">
          <div className="flex items-center gap-3">
            <span
              className="h-5 w-5 shrink-0 rounded-full"
              style={{
                backgroundColor: platform.color,
                boxShadow: `0 0 0 4px ${platform.color}22`,
              }}
            />
            <h2 className="text-2xl font-bold text-slate-100">{platform.name}</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {platform.desc}
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {/* Tags */}
          {platform.tags.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                <Tag className="h-4 w-4 text-neon-blue" />
                特点标签
              </h3>
              <div className="flex flex-wrap gap-2">
                {platform.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-game-elevated px-2.5 py-1 text-xs text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          <div className="rounded-xl border border-game-border bg-game-darker/50 p-4">
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
              <Coins className="h-4 w-4 text-amber-400" />
              价格信息
            </h3>
            <p className="text-sm text-slate-200">{platform.price}</p>
          </div>

          {/* Free info */}
          <div className="rounded-xl border border-neon-green/20 bg-neon-green/5 p-4">
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-neon-green">
              <Gift className="h-4 w-4" />
              免费额度亮点
            </h3>
            <p className="text-sm leading-relaxed text-slate-300">
              {platform.freeInfo}
            </p>
          </div>

          {/* Activity */}
          {platform.activity && (
            <div className="rounded-xl border border-neon-purple/20 bg-neon-purple/5 p-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-neon-purple">
                <Activity className="h-4 w-4" />
                当前活动
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {platform.activity}
              </p>
            </div>
          )}

          {/* Official link */}
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:brightness-110"
            style={{
              backgroundColor: platform.color,
              boxShadow: `0 8px 20px -6px ${platform.color}55`,
            }}
          >
            进入官网
            <ExternalLink className="h-4 w-4" />
          </a>

          <p className="text-center text-xs text-slate-500">
            价格和免费额度信息以官网实时公布为准
          </p>
        </div>
      </div>
    </div>
  );
}
