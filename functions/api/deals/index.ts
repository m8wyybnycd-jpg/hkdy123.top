import { jsonResponse } from "../../lib/response";
import { queryWithFallback, parseJsonArray } from "../../lib/db";
import { deals as staticDeals } from "../../../src/data/deals";
import type { Deal, DealCategory } from "../../../src/types";

/** Valid deal category values for D1 query parameterization. */
const VALID_CATEGORIES: DealCategory[] = [
  "checkin",
  "limited_free",
  "coupon",
  "new_user",
  "wildcard",
];

/**
 * Maps a D1 row (snake_case) to a Deal object (camelCase).
 * Parses the `tags` JSON column into a string array.
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

/** Cache-Control header for public content APIs (5min + SWR). */
const CACHE_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

/** JSON response with cache headers. */
function cachedJsonResponse<T>(data: T): Response {
  return new Response(
    JSON.stringify({ code: 0, data, message: "success" }),
    { status: 200, headers: CACHE_HEADERS }
  );
}

/**
 * GET /api/deals?category=
 *
 * Returns all deals, optionally filtered by category.
 * Tries D1 first, falls back to static TS data.
 * Public endpoint — no auth required.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  // Parse category filter from query string
  const url = new URL(context.request.url);
  const category = url.searchParams.get("category");

  if (category && VALID_CATEGORIES.includes(category as DealCategory)) {
    const cat = category as DealCategory;
    const deals = await queryWithFallback<Deal>(
      context.env.DB,
      "SELECT id, title, description, link, category, tags, updated_at, expires_at FROM deals WHERE category = ? ORDER BY sort_order, updated_at DESC",
      [cat],
      staticDeals.filter((d) => d.category === cat),
      mapDealRow
    );
    return cachedJsonResponse(deals);
  }

  // No category filter — return all deals
  const deals = await queryWithFallback<Deal>(
    context.env.DB,
    "SELECT id, title, description, link, category, tags, updated_at, expires_at FROM deals ORDER BY sort_order, updated_at DESC",
    [],
    staticDeals,
    mapDealRow
  );

  return cachedJsonResponse(deals);
};
