import { useState, useMemo } from "react";
import {
  MessageSquare,
  Filter,
  ExternalLink,
  Search,
  Globe,
  Clock,
  Languages,
  Lock,
  LockOpen,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  smsPlatforms,
  SMS_CATEGORIES,
  categoryGradients,
  type SmsPlatform,
} from "../data/smsPlatforms";
import { useExternalLink } from "../hooks/useExternalLink";
import PageDisabledNotice from "../components/PageDisabledNotice";
import SEO from "../components/SEO";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/**
 * SMS receiving platform navigation page.
 *
 * Displays free/paid SMS verification platforms with category filtering,
 * search, and a redesigned card layout featuring category color bars,
 * structured info grids, and prominent CTA buttons.
 */
export default function SmsPlatformsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const { getConfig } = usePageConfigs();
  const config = getConfig("sms_platforms");

  /** Platforms matching the current category filter and search query. */
  const filteredPlatforms = useMemo(() => {
    return smsPlatforms.filter((platform) => {
      const categoryMatch =
        selectedCategory === "全部" || platform.category === selectedCategory;
      const searchMatch =
        !searchQuery ||
        platform.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        platform.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        platform.countries.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [selectedCategory, searchQuery]);

  /** Per-category platform counts for the hero stats strip. */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of SMS_CATEGORIES) {
      if (cat === "全部") continue;
      counts[cat] = smsPlatforms.filter((p) => p.category === cat).length;
    }
    return counts;
  }, []);

  /** Whether any filter or search is currently active. */
  const hasActiveFilter =
    selectedCategory !== "全部" || searchQuery.trim().length > 0;

  /** Reset all filters and search to their default state. */
  const clearFilters = (): void => {
    setSelectedCategory("全部");
    setSearchQuery("");
  };

  /** Human-readable status text for the current filter state. */
  const statusText = hasActiveFilter
    ? `${selectedCategory === "全部" ? "全部" : selectedCategory} · ${filteredPlatforms.length} 个平台`
    : `显示全部 ${filteredPlatforms.length} 个平台`;

  // Show disabled notice if the page is turned off by admin
  if (config?.is_enabled === 0) {
    return <PageDisabledNotice pageTitle={config?.title} />;
  }

  return (
    <>
    <SEO pageKey="sms-platforms" breadcrumbName="接码平台导航" />
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ================================================================ */}
      {/* Hero Header                                                      */}
      {/* ================================================================ */}
      <div className="animate-slide-up overflow-hidden rounded-2xl border border-game-border bg-gradient-to-br from-neon-purple/10 via-game-card to-neon-blue/10">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Large gradient icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/30 to-neon-blue/30">
              <MessageSquare className="h-7 w-7 text-neon-purple" />
            </div>
            {/* Title block */}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                {config?.title || "接码平台导航"}
              </h1>
              <p className="mt-1 text-sm text-slate-400 sm:text-base">
                {config?.subtitle || "收录国内外免费及付费短信验证码接收平台，方便快速选择"}
              </p>
            </div>
          </div>
        </div>

        {/* Category stats strip */}
        <div className="mt-6 border-t border-game-border/50">
          <div className="grid grid-cols-3 gap-2 px-6 py-4 sm:gap-4 sm:px-8">
            {SMS_CATEGORIES.filter((c) => c !== "全部").map((category) => {
              const gradient = categoryGradients[category];
              return (
                <div
                  key={category}
                  className="flex min-w-0 flex-col items-center gap-0.5 text-center sm:items-start sm:text-left"
                >
                  <span
                    className={`bg-gradient-to-r ${gradient} bg-clip-text text-lg font-bold text-transparent sm:text-xl`}
                  >
                    {categoryCounts[category] ?? 0}
                  </span>
                  <span className="text-xs text-slate-500 sm:text-sm">
                    {category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Unified Toolbar (Search + Filter)                               */}
      {/* ================================================================ */}
      <div className="mt-6 rounded-2xl border border-game-border bg-game-card/60 p-4 backdrop-blur-xl">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索平台名称、简介或国家…"
            className="w-full rounded-xl border border-game-border bg-game-card/60 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:bg-game-card focus:ring-2 focus:ring-neon-blue/20"
          />
        </div>

        {/* Filter row */}
        <div className="mt-3 flex flex-wrap items-center">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            分类筛选
          </span>
          <div className="ml-3 flex flex-wrap items-center gap-2">
            {SMS_CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              const gradient = categoryGradients[category];
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    active && gradient
                      ? `bg-gradient-to-r ${gradient} text-white shadow-md`
                      : active
                        ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-md shadow-neon-blue/20"
                        : "border border-game-border bg-game-darker/50 text-slate-400 hover:border-game-border-hover hover:text-slate-200"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status row */}
        <div className="mt-3 flex items-center justify-between border-t border-game-border/50 pt-3">
          <span className="text-sm text-slate-500">{statusText}</span>
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors duration-200 hover:bg-game-elevated hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
              清除
            </button>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Platform Grid                                                   */}
      {/* ================================================================ */}
      {filteredPlatforms.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {filteredPlatforms.map((platform, index) => (
            <SmsPlatformCard key={platform.id} platform={platform} index={index} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-game-border bg-game-card/40 py-24">
          <MessageSquare className="mb-4 h-14 w-14 text-slate-700" />
          <p className="text-base text-slate-500">没有符合条件的平台</p>
          <button
            onClick={clearFilters}
            className="mt-4 rounded-lg border border-game-border bg-game-card/60 px-4 py-2 text-sm text-slate-400 transition-colors duration-200 hover:border-game-border-hover hover:text-slate-200"
          >
            清除筛选
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* Disclaimer                                                      */}
      {/* ================================================================ */}
      <div className="mt-10 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500/70" />
        <p className="text-xs leading-relaxed text-slate-500">
          免责声明：本页面仅提供接码平台导航，不对平台服务质量负责，请遵守当地法律法规。
          使用接码服务时请注意保护个人隐私，切勿用于违法用途。
        </p>
      </div>

      <RelatedLinks current="sms-platforms" />
    </div>
    </>
  );
}

/**
 * Extract the hostname from a URL string.
 * Falls back to returning the original string if parsing fails.
 *
 * @param url - The full URL to extract the domain from.
 * @returns The hostname portion of the URL.
 */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Individual SMS platform card.
 *
 * Features a left-side category color bar, a header with platform name and
 * free/paid badge, a 2×2 info grid (region, retention, language, registration),
 * a clamped description, feature tags, and a gradient CTA button.
 */
function SmsPlatformCard({
  platform,
  index,
}: {
  platform: SmsPlatform;
  index: number;
}) {
  const { openExternal } = useExternalLink();
  const gradient =
    categoryGradients[platform.category] || "from-slate-600 to-slate-700";
  const domain = getDomain(platform.url);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-game-border-hover hover:shadow-card-hover animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
    >
      {/* Left-side category color bar */}
      <div
        className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${gradient}`}
      />

      {/* ---- Card Header ---- */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="break-words text-lg font-semibold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
            {platform.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              platform.isFree
                ? "bg-neon-green/15 text-neon-green border border-neon-green/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            {platform.isFree ? "免费" : "付费"}
          </span>
        </div>
        <p className="mt-1 break-words text-xs text-slate-500">{domain}</p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-game-border/50" />

      {/* ---- Info Grid (responsive 1→2 columns) ---- */}
      <div className="px-5 py-3">
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
          {/* Region */}
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="shrink-0 text-slate-500">地区</span>
            <span className="line-clamp-2 min-w-0 break-words font-medium text-slate-300">
              {platform.countries}
            </span>
          </div>
          {/* Retention */}
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="shrink-0 text-slate-500">保留</span>
            <span className="line-clamp-2 min-w-0 break-words font-medium text-slate-300">
              {platform.retention}
            </span>
          </div>
          {/* Language */}
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Languages className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="shrink-0 text-slate-500">语言</span>
            <span className="line-clamp-2 min-w-0 break-words font-medium text-slate-300">
              {platform.supportChinese ? "中文" : "英文"}
            </span>
          </div>
          {/* Registration */}
          <div className="flex min-w-0 items-center gap-2 text-xs">
            {platform.needRegister ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            ) : (
              <LockOpen className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            )}
            <span className="shrink-0 text-slate-500">注册</span>
            <span className="line-clamp-2 min-w-0 break-words font-medium text-slate-300">
              {platform.needRegister ? "需要" : "无需"}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-game-border/50" />

      {/* ---- Description + Tags ---- */}
      <div className="px-5 py-3">
        <p className="line-clamp-2 break-words text-sm leading-relaxed text-slate-400">
          {platform.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {platform.features.map((feature) => {
            const isCloudflare = feature.includes("Cloudflare");
            return (
              <span
                key={feature}
                className={`rounded-md px-2.5 py-1 text-xs border ${
                  isCloudflare
                    ? "bg-amber-500/10 text-amber-400/80 border-amber-500/20"
                    : "bg-game-elevated/80 text-slate-400 border-game-border/50"
                }`}
              >
                {feature}
              </span>
            );
          })}
        </div>
      </div>

      {/* ---- CTA Button ---- */}
      <div className="mt-auto px-5 pb-5 pt-1">
        <button
          type="button"
          onClick={() => openExternal(platform.url)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 px-4 py-2.5 text-sm font-medium text-neon-blue transition-all duration-200 hover:from-neon-blue/30 hover:to-neon-purple/30 hover:border-neon-blue/50 hover:shadow-md hover:shadow-neon-blue/10"
        >
          <ExternalLink className="h-4 w-4" />
          访问平台
        </button>
      </div>
    </div>
  );
}
