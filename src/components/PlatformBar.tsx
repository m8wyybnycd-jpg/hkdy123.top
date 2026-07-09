import { ExternalLink, Monitor } from "lucide-react";
import type { Platform } from "../types";

interface PlatformBarProps {
  platforms: Platform[];
}

/**
 * Platform quick-reference section: six cloud-gaming platform cards,
 * each with name, price, free-tier highlights, and official-site link.
 */
export default function PlatformBar({ platforms }: PlatformBarProps) {
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-blue/15 ring-1 ring-neon-blue/20">
          <Monitor className="h-4 w-4 text-neon-blue" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">云电脑平台速查</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => (
          <div
            key={p.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-game-border-hover hover:bg-game-elevated hover:shadow-card-hover"
          >
            {/* Accent line */}
            <span
              className="absolute inset-x-0 top-0 h-0.5 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `linear-gradient(to right, ${p.color}, transparent)`,
              }}
            />

            {/* Name + color dot */}
            <div className="mb-2.5 flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{
                  backgroundColor: p.color,
                  boxShadow: `0 0 0 3px ${p.color}22`,
                }}
              />
              <h3 className="text-base font-bold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
                {p.name}
              </h3>
            </div>

            {/* Desc */}
            <p className="mb-3.5 line-clamp-2 text-sm text-slate-400">{p.desc}</p>

            {/* Price */}
            <div className="mb-2.5">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                价格
              </span>
              <p className="mt-0.5 text-sm font-semibold text-slate-200">
                {p.price}
              </p>
            </div>

            {/* Free info */}
            <div className="mb-4 flex-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                免费
              </span>
              <p className="mt-0.5 text-sm text-slate-400">{p.freeInfo}</p>
            </div>

            {/* Official link */}
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neon-blue transition-colors duration-200 hover:text-neon-blue/80"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              官网
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
