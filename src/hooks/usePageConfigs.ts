import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/api";
import type { PageConfig, PageConfigCache } from "../types";

/** localStorage key for the page configs cache. */
const CACHE_KEY = "page_configs_cache";

/** Cache TTL in milliseconds (5 minutes). */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Default fallback page configs used when the API is unavailable
 * or the cache is empty. Matches the DB seed data.
 * Note: page_key values use hyphens (e.g. "cloud-games") to match
 * the DB schema and route paths directly.
 */
export const DEFAULT_PAGE_CONFIGS: PageConfig[] = [
  {
    page_key: "cloud-games",
    page_name: "云游戏",
    title: "不用高配电脑，也能畅玩 3A 大作",
    subtitle: "汇聚各大云游戏平台，按需选择最划算的方案",
    description: "",
    is_enabled: true,
    params: "{}",
    sort_order: 1,
    updated_at: "",
    updated_by: null,
  },
  {
    page_key: "cloud-desktops",
    page_name: "云电脑",
    title: "随时随地，高效办公",
    subtitle: "汇聚优质办公云电脑方案",
    description: "",
    is_enabled: true,
    params: "{}",
    sort_order: 2,
    updated_at: "",
    updated_by: null,
  },
  {
    page_key: "deals",
    page_name: "薅羊毛",
    title: "精选优惠，天天薅羊毛",
    subtitle: "最新游戏优惠信息一网打尽",
    description: "",
    is_enabled: true,
    params: "{}",
    sort_order: 3,
    updated_at: "",
    updated_by: null,
  },
  {
    page_key: "library",
    page_name: "游戏库",
    title: "探索你的下一款游戏",
    subtitle: "精选游戏推荐与评测",
    description: "",
    is_enabled: true,
    params: "{}",
    sort_order: 4,
    updated_at: "",
    updated_by: null,
  },
  {
    page_key: "free-games",
    page_name: "免费资源",
    title: "免费也能玩得爽",
    subtitle: "精选免费游戏资源",
    description: "",
    is_enabled: true,
    params: "{}",
    sort_order: 5,
    updated_at: "",
    updated_by: null,
  },
  {
    page_key: "sms-platforms",
    page_name: "接码平台",
    title: "接码平台导航",
    subtitle: "精选靠谱的接码平台",
    description: "",
    is_enabled: true,
    params: "{}",
    sort_order: 6,
    updated_at: "",
    updated_by: null,
  },
  {
    page_key: "home",
    page_name: "首页",
    title: "一个入口，玩转所有云端世界",
    subtitle:
      "3000+ 云游戏、100+ 云电脑、每日更新的羊毛优惠——一个账号极速开玩，告别卡顿与昂贵硬件。",
    description: "",
    is_enabled: true,
    params:
      '{"kickerHero":"CLOUD GAMING · CLOUD PC · DEALS HUB","secTrioKicker":"WHY 云玩汇","secTrioTitle":"三块核心，覆盖你的全部云端需求","secGamesKicker":"CLOUD GAMES","secGamesTitle":"热门云游戏，即点即玩","secPcKicker":"CLOUD PC · 云端办公","secPcTitle":"云端办公，高性能云电脑随开随用","secDealsKicker":"DEALS HUB · 优惠聚合","secDealsTitle":"羊毛优惠聚合，省钱才是硬道理","secResKicker":"FREE RESOURCES · 免费资源","secResTitle":"免费游戏资源，一键转存即玩","secProofKicker":"TRUSTED BY USERS · 用户口碑","secProofTitle":"被万千玩家信赖的云端入口","secCtaKicker":"GET STARTED · 立即开始","secCtaTitle":"现在加入云玩汇，开启你的云端世界","secCtaSub":"免费注册，秒级开通，海量游戏与云电脑等你体验"}',
    sort_order: 0,
    updated_at: "",
    updated_by: null,
  },
];

/**
 * Read cached page configs from localStorage.
 * Returns null if the cache is missing or expired.
 */
function readCache(): PageConfig[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as PageConfigCache;
    if (!cache.data || !cache.timestamp) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache.data;
  } catch {
    return null;
  }
}

/**
 * Write page configs to localStorage cache.
 */
function writeCache(data: PageConfig[]): void {
  try {
    const cache: PageConfigCache = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage may be unavailable (private mode); silently ignore.
  }
}

/**
 * Clear the page configs cache (e.g. after admin updates).
 */
export function clearPageConfigsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Custom hook for fetching and caching page configurations.
 *
 * - Uses a 5-minute localStorage cache to avoid redundant API calls.
 * - Falls back to DEFAULT_PAGE_CONFIGS when the API fails.
 * - Returns enabled pages sorted by sort_order for navigation.
 * - Provides a `getConfig(page_key)` helper for individual page lookups.
 * - Provides a `refresh()` method to force-fetch new data.
 *
 * @returns Object with `configs`, `enabledConfigs`, `loading`, `refresh`, and `getConfig`.
 */
export function usePageConfigs(): {
  configs: PageConfig[];
  enabledConfigs: PageConfig[];
  loading: boolean;
  refresh: () => void;
  getConfig: (pageKey: string) => PageConfig | null;
} {
  const [configs, setConfigs] = useState<PageConfig[]>(() => {
    // Initialize from cache or defaults (instant, no flash)
    return readCache() ?? DEFAULT_PAGE_CONFIGS;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchConfigs = useCallback(async () => {
    try {
      const data = await apiClient.getPageConfigs();
      if (data && data.length > 0) {
        setConfigs(data);
        writeCache(data);
      }
    } catch {
      // API failed — keep current state (cache or defaults)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  /** Force refresh: clear cache and re-fetch. */
  const refresh = useCallback(() => {
    clearPageConfigsCache();
    setLoading(true);
    fetchConfigs();
  }, [fetchConfigs]);

  /** Enabled configs sorted by sort_order (for navigation tabs). */
  const enabledConfigs = configs
    .filter((c) => c.is_enabled === true)
    .sort((a, b) => a.sort_order - b.sort_order);

  /** Find a specific page config by page_key. */
  const getConfig = useCallback(
    (pageKey: string): PageConfig | null => {
      return configs.find((c) => c.page_key === pageKey) ?? null;
    },
    [configs]
  );

  return { configs, enabledConfigs, loading, refresh, getConfig };
}
