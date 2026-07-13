import { useEffect, useState, useMemo } from "react";
import { Gift } from "lucide-react";
import { apiClient } from "../services/api";
import { deals as staticDeals } from "../data/deals";
import type { Deal, DealCategory } from "../types";
import DealCard from "../components/DealCard";
import DealFilter from "../components/DealFilter";
import PageDisabledNotice from "../components/PageDisabledNotice";
import SEO from "../components/SEO";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/** Skeleton placeholder for loading deal cards. */
function DealSkeleton() {
  return (
    <div className="rounded-2xl border border-game-border bg-game-card p-5">
      <div className="skeleton mb-3 h-5 w-20 rounded-md" />
      <div className="skeleton mb-2 h-5 w-3/4" />
      <div className="skeleton mb-4 h-4 w-full" />
      <div className="skeleton mb-2 h-4 w-5/6" />
      <div className="skeleton mb-4 h-3 w-2/3" />
      <div className="skeleton h-10 w-full" />
    </div>
  );
}

/**
 * Deals Tab page.
 * Category filter + deal card list. Expired deals are greyed out
 * but still visible. Deals are sorted by updatedAt descending.
 */
export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(staticDeals);
  const [selectedCategory, setSelectedCategory] = useState<DealCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const { getConfig } = usePageConfigs();
  const config = getConfig("deals");

  useEffect(() => {
    let mounted = true;
    apiClient
      .getDeals()
      .then((data) => {
        if (mounted && data.length > 0) {
          setDeals(data);
        }
      })
      .catch(() => {
        // Fallback to static data already in state
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  /** Filter and sort deals by category and update time. */
  const filteredDeals = useMemo<Deal[]>(() => {
    let result = deals;
    if (selectedCategory !== "all") {
      result = result.filter((d) => d.category === selectedCategory);
    }
    // Sort by updatedAt descending (newest first)
    return [...result].sort((a, b) => {
      const timeA = new Date(a.updatedAt).getTime() || 0;
      const timeB = new Date(b.updatedAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [deals, selectedCategory]);

  // Show disabled notice if the page is turned off by admin
  if (config && !config.is_enabled) {
    return <PageDisabledNotice pageTitle={config?.title} />;
  }

  return (
    <>
    <SEO pageKey="deals" breadcrumbName="薅羊毛优惠" pageConfig={config} />
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-game-border bg-gradient-to-br from-game-card to-game-darker px-6 py-10 text-center">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-neon-green/10 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-green/20 to-emerald-500/20 ring-1 ring-game-border">
            <Gift className="h-6 w-6 text-neon-green" />
          </div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            <span className="gradient-text">{config?.title || "薅羊毛攻略汇总"}</span>
          </h1>
          <p className="text-sm text-slate-400">
            {config?.subtitle || "签到免费 · 限免监控 · 优惠码 · 新用户福利 · 野路子白嫖"}
          </p>
        </div>
      </div>

      {/* Filter */}
      <DealFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        resultCount={filteredDeals.length}
      />

      {/* Deal list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DealSkeleton key={i} />
          ))}
        </div>
      ) : filteredDeals.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-game-card ring-1 ring-game-border">
            <Gift className="h-8 w-8 text-slate-600" />
          </div>
          <p className="text-lg text-slate-400">该分类下暂无薅羊毛信息</p>
          <p className="mt-1 text-sm text-slate-600">试试切换其他分类</p>
        </div>
      )}

      <RelatedLinks current="deals" />
    </div>
    </>
  );
}
