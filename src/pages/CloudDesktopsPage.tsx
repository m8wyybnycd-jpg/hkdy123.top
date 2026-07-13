import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { apiClient } from "../services/api";
import { desktops as staticDesktops } from "../data/desktops";
import type { CloudDesktop } from "../types";
import DesktopCard from "../components/DesktopCard";
import PageDisabledNotice from "../components/PageDisabledNotice";
import SEO from "../components/SEO";
import RelatedLinks from "../components/RelatedLinks";
import { usePageConfigs } from "../hooks/usePageConfigs";

/** Skeleton placeholder for loading desktop cards. */
function DesktopSkeleton() {
  return (
    <div className="rounded-2xl border border-game-border bg-game-card p-5">
      <div className="skeleton mb-3 h-9 w-9 rounded-lg" />
      <div className="skeleton mb-4 h-5 w-28" />
      <div className="skeleton mb-2 h-4 w-full" />
      <div className="skeleton mb-4 h-4 w-2/3" />
      <div className="skeleton mb-4 h-3 w-3/4" />
      <div className="skeleton h-10 w-full" />
    </div>
  );
}

/**
 * Cloud Desktops Tab page.
 * Hero section + office cloud desktop card grid.
 */
export default function CloudDesktopsPage() {
  const [desktops, setDesktops] = useState<CloudDesktop[]>(staticDesktops);
  const [loading, setLoading] = useState(true);
  const { getConfig } = usePageConfigs();
  const config = getConfig("cloud-desktops");

  useEffect(() => {
    let mounted = true;
    apiClient
      .getDesktops()
      .then((data) => {
        if (mounted && data.length > 0) {
          setDesktops(data);
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
    <SEO pageKey="cloud-desktops" breadcrumbName="云电脑入口" pageConfig={config} />
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-game-border bg-gradient-to-br from-game-card to-game-darker px-6 py-12 text-center">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-neon-blue/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-64 rounded-full bg-neon-purple/5 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 ring-1 ring-game-border">
            <Monitor className="h-6 w-6 text-neon-blue" />
          </div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
            <span className="gradient-text">{config?.title || "不买新电脑，云端高效办公"}</span>
          </h1>
          <p className="text-sm text-slate-400">
            {config?.subtitle || `${desktops.length} 大办公云电脑平台，设计/开发/远程办公一站式解决`}
          </p>
        </div>
      </div>

      {/* Desktop grid */}
      {loading ? (
        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DesktopSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {desktops.map((desktop) => (
            <DesktopCard key={desktop.id} desktop={desktop} />
          ))}
        </div>
      )}

      <RelatedLinks current="cloud-desktops" />
    </div>
    </>
  );
}
