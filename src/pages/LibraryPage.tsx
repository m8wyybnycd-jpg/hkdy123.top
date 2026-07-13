import { useMemo, useState } from "react";
import { Library } from "lucide-react";
import type { Config, Game, GameType, PlatformId } from "../types";
import { games } from "../data/games";
import { platforms } from "../data/platforms";
import FilterBar from "../components/FilterBar";
import GameCard from "../components/GameCard";
import GameModal from "../components/GameModal";
import PageDisabledNotice from "../components/PageDisabledNotice";
import SEO from "../components/SEO";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/** Skeleton placeholder for loading game cards. */
function GameSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-game-border bg-game-card">
      <div className="skeleton h-36 w-full rounded-none" />
      <div className="p-4">
        <div className="skeleton mb-3 h-5 w-3/4" />
        <div className="skeleton mb-3 h-4 w-1/2" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Game Library Tab page.
 * Reuses the existing FilterBar, GameCard, and GameModal components.
 * Game data stays as static TS file (per architecture decision A4).
 */
export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<GameType | "全部">("全部");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<Config | "all">("all");
  const [sortByRating, setSortByRating] = useState<boolean>(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const { getConfig } = usePageConfigs();
  const config = getConfig("library");

  /** Toggle a platform in the multi-select filter. */
  const handlePlatformToggle = (id: PlatformId): void => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  /** Compute filtered + sorted game list. */
  const filteredGames = useMemo<Game[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = games.filter((g) => {
      if (query && !g.name.toLowerCase().includes(query)) return false;
      if (selectedType !== "全部" && g.type !== selectedType) return false;
      if (
        selectedPlatforms.length > 0 &&
        !selectedPlatforms.some((p) => g.platforms.includes(p))
      )
        return false;
      if (selectedConfig !== "all" && g.config !== selectedConfig) return false;
      return true;
    });

    if (sortByRating) {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }
    return result;
  }, [searchQuery, selectedType, selectedPlatforms, selectedConfig, sortByRating]);

  // Show disabled notice if the page is turned off by admin
  if (config && !config.is_enabled) {
    return <PageDisabledNotice pageTitle={config?.title} />;
  }

  return (
    <>
    <SEO pageKey="library" breadcrumbName="攻略文章库" pageConfig={config} />
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-game-border bg-gradient-to-br from-game-card to-game-darker px-6 py-10 text-center">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-neon-purple/10 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 ring-1 ring-game-border">
            <Library className="h-6 w-6 text-neon-purple" />
          </div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            <span className="gradient-text">{config?.title || "游戏库"}</span>
          </h1>
          <p className="text-sm text-slate-400">
            {config?.subtitle || `汇聚 ${games.length} 款热门游戏 × ${platforms.length} 大云平台，按类型发现好游戏`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedPlatforms={selectedPlatforms}
        onPlatformToggle={handlePlatformToggle}
        selectedConfig={selectedConfig}
        onConfigChange={setSelectedConfig}
        sortByRating={sortByRating}
        onSortToggle={() => setSortByRating((v) => !v)}
        resultCount={filteredGames.length}
      />

      {/* Game grid */}
      {filteredGames.length > 0 ? (
        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              platforms={platforms}
              onClick={() => setSelectedGame(game)}
            />
          ))}
        </div>
      ) : (
        <div className="mb-12 flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-game-card ring-1 ring-game-border">
            <Library className="h-8 w-8 text-slate-600" />
          </div>
          <p className="text-lg text-slate-400">没有找到符合条件的游戏</p>
          <p className="mt-1 text-sm text-slate-600">
            试试调整筛选条件或清空搜索
          </p>
        </div>
      )}

      {/* Game detail modal */}
      {selectedGame && (
        <GameModal
          game={selectedGame}
          platforms={platforms}
          onClose={() => setSelectedGame(null)}
        />
      )}

      <RelatedLinks current="library" />
    </div>
    </>
  );
}
