import { jsonResponse } from "../lib/response";
import { queryWithFallback, parseJsonArray } from "../lib/db";
import { games as staticGames } from "../../src/data/games";
import { platforms as staticPlatforms } from "../../src/data/platforms";
import { deals as staticDeals } from "../../src/data/deals";
import type {
  Game,
  Platform,
  Deal,
  SearchResult,
  PlatformId,
  DealCategory,
  GameType,
  Config,
} from "../../src/types";

/**
 * Maps a D1 platform row to a Platform object.
 */
function mapPlatformRow(row: Record<string, unknown>): Platform {
  return {
    id: row.id as PlatformId,
    name: row.name as string,
    color: row.color as string,
    price: row.price as string,
    freeInfo: (row.free_info as string) ?? "",
    url: row.url as string,
    desc: (row.description as string) ?? "",
    tags: parseJsonArray(row.tags),
    activity: (row.activity as string) ?? "",
  };
}

/**
 * Maps a D1 deal row to a Deal object.
 */
function mapDealRow(row: Record<string, unknown>): Deal {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    link: row.link as string,
    category: row.category as DealCategory,
    tags: parseJsonArray(row.tags),
    updatedAt: (row.updated_at as string) ?? "",
    expiresAt: (row.expires_at as string) || null,
  };
}

/**
 * GET /api/search?q=
 *
 * Global search across games, platforms, and deals.
 * Supports space-separated keywords (all keywords must match).
 * Games use static data; platforms and deals try D1 with static fallback.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const url = new URL(context.request.url);
  const q = url.searchParams.get("q") || "";

  // Split into keywords (support space separation)
  const keywords = q.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (keywords.length === 0) {
    return jsonResponse({ games: [], platforms: [], deals: [] } as SearchResult);
  }

  /** Check if text matches all keywords. */
  const match = (text: string): boolean =>
    keywords.every((kw) => text.toLowerCase().includes(kw));

  // ── Search games (static data, not in D1) ──────────────
  const matchedGames: Game[] = staticGames.filter(
    (g) =>
      match(g.name) ||
      match(g.type) ||
      g.tags.some((t) => match(t)) ||
      match(g.desc)
  );

  // ── Search platforms (D1 with static fallback) ─────────
  const allPlatforms = await queryWithFallback<Platform>(
    context.env.DB,
    "SELECT id, name, color, price, free_info, url, description, tags, activity FROM platforms ORDER BY sort_order",
    [],
    staticPlatforms,
    mapPlatformRow
  );
  const matchedPlatforms: Platform[] = allPlatforms.filter(
    (p) =>
      match(p.name) ||
      match(p.desc) ||
      p.tags.some((t) => match(t)) ||
      match(p.activity)
  );

  // ── Search deals (D1 with static fallback) ─────────────
  const allDeals = await queryWithFallback<Deal>(
    context.env.DB,
    "SELECT id, title, description, link, category, tags, updated_at, expires_at FROM deals ORDER BY updated_at DESC",
    [],
    staticDeals,
    mapDealRow
  );
  const matchedDeals: Deal[] = allDeals.filter(
    (d) =>
      match(d.title) ||
      match(d.description) ||
      d.tags.some((t) => match(t))
  );

  const result: SearchResult = {
    games: matchedGames,
    platforms: matchedPlatforms,
    deals: matchedDeals,
  };

  return jsonResponse(result);
};
