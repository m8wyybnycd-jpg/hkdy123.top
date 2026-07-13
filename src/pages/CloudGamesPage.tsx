import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { apiClient } from "../services/api";
import { platforms as staticPlatforms } from "../data/platforms";
import type { Platform } from "../types";
import PlatformCard from "../components/PlatformCard";
import PlatformModal from "../components/PlatformModal";
import TipsSection from "../components/TipsSection";
import PageDisabledNotice from "../components/PageDisabledNotice";
import SEO from "../components/SEO";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/** Skeleton placeholder for loading platform cards. */
function PlatformSkeleton() {
  return (
    <div className="rounded-2xl border border-game-border bg-game-card p-5">
      <div className="skeleton mb-3 h-5 w-32" />
      <div className="skeleton mb-4 h-4 w-full" />
      <div className="skeleton mb-2 h-4 w-2/3" />
      <div className="skeleton mb-4 h-3 w-3/4" />
      <div className="skeleton h-10 w-full" />
    </div>
  );
}

/**
 * Cloud Games Tab page.
 * Hero section + platform card grid + platform detail modal.
 */
export default function CloudGamesPage() {
  const [platforms, setPlatforms] = useState<Platform[]>(staticPlatforms);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [loading, setLoading] = useState(true);
  const { getConfig } = usePageConfigs();
  const config = getConfig("cloud-games");

  useEffect(() => {
    let mounted = true;
    apiClient
      .getPlatforms()
      .then((data) => {
        if (mounted && data.length > 0) {
          setPlatforms(data);
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

  // Show disabled notice if the page is turned off by admin
  if (config && !config.is_enabled) {
    return <PageDisabledNotice pageTitle={config?.title} />;
  }

  return (
    <>
    <SEO pageKey="cloud-games" breadcrumbName="云游戏平台" />
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-game-border bg-gradient-to-br from-game-card to-game-darker px-6 py-12 text-center">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-neon-blue/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-64 rounded-full bg-neon-purple/5 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 ring-1 ring-game-border">
            <Monitor className="h-6 w-6 text-neon-blue" />
          </div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            <span className="gradient-text">{config?.title || "不用高配电脑，也能畅玩 3A 大作"}</span>
          </h1>
          <p className="text-sm text-slate-400">
            {config?.subtitle || `汇聚 ${platforms.length} 大云游戏平台，按需选择最划算的方案`}
          </p>
        </div>
      </div>

      {/* Platform grid */}
      {loading ? (
        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <PlatformSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {platforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              onClick={() => setSelectedPlatform(platform)}
            />
          ))}
        </div>
      )}

      {/* Tips */}
      <TipsSection />

      {/* Platform detail modal */}
      {selectedPlatform && (
        <PlatformModal
          platform={selectedPlatform}
          onClose={() => setSelectedPlatform(null)}
        />
      )}

      <RelatedLinks current="cloud-games" />
    </div>
    </>
  );
}
