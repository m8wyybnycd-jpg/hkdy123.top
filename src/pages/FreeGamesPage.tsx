import { useState, useMemo, useEffect } from "react";
import { Download, Filter, Gamepad2, ExternalLink, Search } from "lucide-react";
import { apiClient } from "../services/api";
import { FREE_GAME_TYPES, FREE_GAME_PLATFORMS, typeGradients, type FreeGame, freeGames as staticFreeGames } from "../data/freeGames";
import { useExternalLink } from "../hooks/useExternalLink";
import PageDisabledNotice from "../components/PageDisabledNotice";
import SEO from "../components/SEO";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/**
 * Free single-player game resource page.
 * Displays free games from Quark Pan shares with type/platform filtering.
 * Data is D1-backed (admin managed), with a static fallback.
 */
export default function FreeGamesPage() {
  const [games, setGames] = useState<FreeGame[]>(staticFreeGames);
  const [selectedType, setSelectedType] = useState<string>("全部");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const { getConfig } = usePageConfigs();
  const config = getConfig("free-games");

  useEffect(() => {
    let mounted = true;
    apiClient
      .getFreeGames()
      .then((data) => {
        if (mounted && data.length > 0) setGames(data);
      })
      .catch(() => {
        // Fallback to static data already in state
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const typeMatch = selectedType === "全部" || game.type === selectedType;
      const platformMatch = selectedPlatform === "全部" || game.platform === selectedPlatform;
      const searchMatch =
        !searchQuery ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && platformMatch && searchMatch;
    });
  }, [selectedType, selectedPlatform, searchQuery]);

  // Show disabled notice if the page is turned off by admin
  if (config && !config.is_enabled) {
    return <PageDisabledNotice pageTitle={config?.title} />;
  }

  return (
    <>
    <SEO pageKey="free-games" breadcrumbName="免费游戏资源" pageConfig={config} />
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-green/20 to-neon-blue/20">
            <Gamepad2 className="h-6 w-6 text-neon-green" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-100">
              {config?.title || "免费单机游戏资源库"}
            </h1>
            <p className="text-sm text-slate-500">
              {config?.subtitle || "资源来源于夸克网盘分享，仅供个人学习体验"}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索游戏名称或简介…"
            className="w-full rounded-xl border border-game-border bg-game-card/60 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 focus:border-neon-blue/50 focus:bg-game-card focus:ring-2 focus:ring-neon-blue/20"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3 rounded-2xl border border-game-border bg-game-card/60 p-4 backdrop-blur-xl">
        {/* Type filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 text-sm font-medium text-slate-400">
            <Filter className="h-3.5 w-3.5" /> 类型
          </span>
          {FREE_GAME_TYPES.map((type) => {
            const active = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
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

        {/* Platform filter */}
        <div className="flex flex-wrap items-center gap-2 border-t border-game-border pt-3">
          <span className="mr-1 text-sm font-medium text-slate-400">平台</span>
          {FREE_GAME_PLATFORMS.map((platform) => {
            const active = selectedPlatform === platform;
            return (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-neon-green to-teal-500 text-game-darker shadow-md"
                    : "border border-game-border bg-game-darker/50 text-slate-400 hover:border-game-border-hover hover:text-slate-200"
                }`}
              >
                {platform}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-end border-t border-game-border pt-3">
          <span className="text-sm text-slate-500">
            共 <span className="font-medium text-slate-300">{filteredGames.length}</span> 款游戏
          </span>
        </div>
      </div>

      {/* Game grid */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game, index) => (
            <FreeGameCard key={game.id} game={game} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-game-border bg-game-card/40 py-20">
          <Gamepad2 className="mb-3 h-12 w-12 text-slate-600" />
          <p className="text-slate-500">没有符合条件的游戏</p>
          <button
            onClick={() => {
              setSelectedType("全部");
              setSelectedPlatform("全部");
              setSearchQuery("");
            }}
            className="mt-3 rounded-lg border border-game-border bg-game-card/60 px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            清除筛选
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 rounded-xl border border-game-border bg-game-card/40 p-4">
        <p className="text-xs leading-relaxed text-slate-500">
          ⚠️ 免责声明：以上游戏资源来源于夸克网盘公开分享，仅供个人学习体验，请在下载后 24 小时内删除。
          游戏版权归各开发商/发行商所有。如喜欢游戏请支持正版。
        </p>
      </div>

      <RelatedLinks current="free-games" />
    </div>
    </>
  );
}

/** Individual game card with gradient cover, FREE badge, and download button. */
function FreeGameCard({ game, index }: { game: FreeGame; index: number }) {
  const { openExternal } = useExternalLink();
  const gradient = typeGradients[game.type] || "from-slate-600/90 via-slate-700/90 to-slate-900/90";

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-game-border bg-game-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-game-border-hover hover:shadow-card-hover animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
    >
      {/* Cover */}
      <div className={`relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="relative text-5xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
          {game.emoji}
        </span>
        {/* Type chip */}
        <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-white/90 backdrop-blur-md">
          {game.type}
        </span>
        {/* FREE badge */}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-neon-green/90 px-2 py-0.5 text-xs font-bold text-game-darker backdrop-blur-md">
          免费
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="break-words text-base font-semibold text-slate-100 transition-colors duration-200 group-hover:text-neon-blue">
          {game.name}
        </h3>
        <p className="line-clamp-2 break-words text-sm text-slate-400">{game.description}</p>

        {/* Platform chip */}
        <div className="mt-1">
          <span className="rounded bg-game-elevated px-2 py-0.5 text-xs text-slate-400">
            {game.platform}
          </span>
        </div>

        {/* Download button */}
        <button
          type="button"
          onClick={() => openExternal(game.quarkLink)}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-lg border border-neon-green/30 bg-neon-green/10 px-3 py-2 text-sm font-medium text-neon-green transition-all duration-200 hover:border-neon-green/50 hover:bg-neon-green/20"
        >
          <Download className="h-4 w-4" />
          夸克网盘下载
          <ExternalLink className="h-3 w-3 opacity-60" />
        </button>
      </div>
    </div>
  );
}
