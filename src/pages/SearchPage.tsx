import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Gamepad2, Monitor, Gift } from "lucide-react";
import { apiClient } from "../services/api";
import type { SearchResult as SearchResultType, Game, Platform, Deal } from "../types";
import { platforms as staticPlatforms } from "../data/platforms";
import SearchBar from "../components/SearchBar";
import GameCard from "../components/GameCard";
import GameModal from "../components/GameModal";
import PlatformCard from "../components/PlatformCard";
import DealCard from "../components/DealCard";

/** Empty search result. */
const emptyResult: SearchResultType = { games: [], platforms: [], deals: [] };

/** Hot tags to suggest when no results found. */
const HOT_TAGS = ["云游戏", "免费", "3A", "MOBA", "Steam"];

/** Number of items to show per category initially. */
const INITIAL_SHOW = 12;

/** Loading skeleton for search results. */
function SearchSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-game-border bg-game-card"
        >
          <div className="skeleton h-36 w-full rounded-none" />
          <div className="p-4">
            <div className="skeleton mb-3 h-5 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Search results page.
 * Displays categorized results for games, platforms, and deals.
 * - Shows 12 items per category initially with "load more" button.
 * - Shows hot tag suggestions when no results found.
 * - Clicking a game card opens a detail modal.
 */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultType>(emptyResult);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Visible counts per category for "load more" pagination.
  const [visibleGames, setVisibleGames] = useState(INITIAL_SHOW);
  const [visiblePlatforms, setVisiblePlatforms] = useState(INITIAL_SHOW);
  const [visibleDeals, setVisibleDeals] = useState(INITIAL_SHOW);

  /** Perform search via API (with local fallback). */
  const performSearch = (q: string) => {
    setQuery(q);
    // Reset visible counts on new search.
    setVisibleGames(INITIAL_SHOW);
    setVisiblePlatforms(INITIAL_SHOW);
    setVisibleDeals(INITIAL_SHOW);
    if (q.trim()) {
      setSearchParams({ q: q.trim() });
      setLoading(true);
      apiClient
        .search(q)
        .then((data) => setResults(data))
        .catch(() => setResults(emptyResult))
        .finally(() => setLoading(false));
    } else {
      setResults(emptyResult);
      setSearchParams({});
    }
  };

  // Run initial search on mount if query param exists
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Handle clicking a hot tag suggestion. */
  const handleTagClick = useCallback((tag: string) => {
    performSearch(tag);
  }, []);

  const totalCount = results.games.length + results.platforms.length + results.deals.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Search bar */}
      <div className="mb-8">
        <SearchBar initialValue={initialQuery} onSearch={performSearch} autoFocus={!initialQuery} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          <div className="h-5 w-64 skeleton" />
          <SearchSkeleton />
        </div>
      )}

      {/* Results */}
      {!loading && query && (
        <>
          {/* Summary */}
          <div className="mb-6 text-sm text-slate-400">
            {totalCount > 0 ? (
              <span>
                找到{" "}
                <span className="font-medium text-neon-blue">{totalCount}</span> 条与 "
                <span className="text-slate-200">{query}</span>" 相关的结果
              </span>
            ) : (
              <span>
                没有找到与 "<span className="text-slate-200">{query}</span>"
                相关的结果
              </span>
            )}
          </div>

          {/* Games section */}
          {results.games.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-blue/15 ring-1 ring-neon-blue/20">
                  <Gamepad2 className="h-4 w-4 text-neon-blue" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">
                  游戏 ({results.games.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.games.slice(0, visibleGames).map((game: Game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    platforms={staticPlatforms}
                    onClick={() => setSelectedGame(game)}
                  />
                ))}
              </div>
              {results.games.length > visibleGames && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisibleGames((prev) => prev + INITIAL_SHOW)}
                    className="rounded-xl border border-game-border px-6 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:border-slate-600 hover:bg-game-card/60 hover:text-slate-200"
                  >
                    加载更多
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Platforms section */}
          {results.platforms.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-purple/15 ring-1 ring-neon-purple/20">
                  <Monitor className="h-4 w-4 text-neon-purple" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">
                  云游戏平台 ({results.platforms.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.platforms.slice(0, visiblePlatforms).map((platform: Platform) => (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    onClick={() => navigate("/cloud-games")}
                  />
                ))}
              </div>
              {results.platforms.length > visiblePlatforms && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisiblePlatforms((prev) => prev + INITIAL_SHOW)}
                    className="rounded-xl border border-game-border px-6 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:border-slate-600 hover:bg-game-card/60 hover:text-slate-200"
                  >
                    加载更多
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Deals section */}
          {results.deals.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-green/15 ring-1 ring-neon-green/20">
                  <Gift className="h-4 w-4 text-neon-green" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">
                  薅羊毛 ({results.deals.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.deals.slice(0, visibleDeals).map((deal: Deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
              {results.deals.length > visibleDeals && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisibleDeals((prev) => prev + INITIAL_SHOW)}
                    className="rounded-xl border border-game-border px-6 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:border-slate-600 hover:bg-game-card/60 hover:text-slate-200"
                  >
                    加载更多
                  </button>
                </div>
              )}
            </section>
          )}

          {/* No results — show hot tags */}
          {totalCount === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-game-elevated">
                <Search className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-lg font-medium text-slate-300">没有找到相关结果</p>
              <p className="mt-1 text-sm text-slate-500">
                试试其他关键词，或点击下方热门标签
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {HOT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="rounded-full border border-game-border bg-game-card/60 px-4 py-1.5 text-sm text-slate-300 transition-all duration-200 hover:border-neon-blue/30 hover:bg-neon-blue/10 hover:text-neon-blue"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* No query - empty state */}
      {!query && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-game-elevated">
            <Search className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-lg font-medium text-slate-300">搜索云游戏、平台和优惠</p>
          <p className="mt-1 text-sm text-slate-500">
            输入关键词开始探索
          </p>
        </div>
      )}

      {/* Game detail modal */}
      {selectedGame && (
        <GameModal
          game={selectedGame}
          platforms={staticPlatforms}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}
