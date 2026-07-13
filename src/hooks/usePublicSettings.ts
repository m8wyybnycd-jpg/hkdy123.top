import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/api";

/** localStorage key for the public settings cache. */
const CACHE_KEY = "public_settings_cache";

/** Cache TTL in milliseconds (10 minutes). */
const CACHE_TTL = 10 * 60 * 1000;

/** Default fallback settings used when the API is unavailable. */
export const DEFAULT_PUBLIC_SETTINGS: Record<string, string> = {
  site_name: "云玩汇",
  site_description: "云游戏/云电脑入口聚合平台",
  logo_url: "",
  icp_number: "",
  contact_email: "",
  contact_qq: "",
  contact_wechat: "",
};

/** Public-facing settings keys (safe to expose without auth). */
export const PUBLIC_SETTING_KEYS = [
  "site_name",
  "site_description",
  "logo_url",
  "icp_number",
  "contact_email",
  "contact_qq",
  "contact_wechat",
] as const;

/**
 * Read cached public settings from localStorage.
 * Returns null if the cache is missing or expired.
 */
function readCache(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as { data: Record<string, string>; timestamp: number };
    if (!cache.data || !cache.timestamp) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache.data;
  } catch {
    return null;
  }
}

/**
 * Write public settings to localStorage cache.
 */
function writeCache(data: Record<string, string>): void {
  try {
    const cache = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage may be unavailable (private mode); silently ignore.
  }
}

/**
 * Clear the public settings cache (e.g. after admin updates).
 */
export function clearPublicSettingsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Custom hook for fetching and caching public-facing settings.
 *
 * - Uses a 10-minute localStorage cache to avoid redundant API calls.
 * - Falls back to DEFAULT_PUBLIC_SETTINGS when the API fails.
 * - Returns a `get(key, fallback)` helper for type-safe lookups.
 *
 * @returns Object with `settings`, `loading`, `refresh`, and `get`.
 */
export function usePublicSettings(): {
  settings: Record<string, string>;
  loading: boolean;
  refresh: () => void;
  get: (key: string, fallback?: string) => string;
} {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    return readCache() ?? DEFAULT_PUBLIC_SETTINGS;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiClient.getPublicSettings();
      if (data && typeof data === "object") {
        setSettings(data);
        writeCache(data);
      }
    } catch {
      // API failed — keep current state (cache or defaults)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /** Force refresh: clear cache and re-fetch. */
  const refresh = useCallback(() => {
    clearPublicSettingsCache();
    setLoading(true);
    fetchSettings();
  }, [fetchSettings]);

  /** Get a specific setting value with fallback. */
  const get = useCallback(
    (key: string, fallback?: string): string => {
      return settings[key] ?? fallback ?? "";
    },
    [settings]
  );

  return { settings, loading, refresh, get };
}
