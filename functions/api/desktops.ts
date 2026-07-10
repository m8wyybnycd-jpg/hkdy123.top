import { jsonResponse, unauthorized, requireAuth } from "../lib/response";
import { queryWithFallback, parseJsonArray } from "../lib/db";
import { desktops as staticDesktops } from "../../src/data/desktops";
import type { CloudDesktop } from "../../src/types";

/**
 * Maps a D1 row (snake_case) to a CloudDesktop object (camelCase).
 * Parses the `scenarios` JSON column into a string array.
 */
function mapDesktopRow(row: Record<string, unknown>): CloudDesktop {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    desc: (row.description as string) ?? "",
    scenarios: parseJsonArray(row.scenarios),
    priceRange: (row.price_range as string) ?? "",
    activity: (row.activity as string) ?? "",
  };
}

/**
 * GET /api/desktops
 *
 * Returns all office cloud desktop platforms (5+).
 * Tries D1 first, falls back to static TS data.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const user = requireAuth(context.data);
  if (!user) {
    return unauthorized();
  }

  const desktops = await queryWithFallback<CloudDesktop>(
    context.env.DB,
    "SELECT id, name, url, description, scenarios, price_range, activity FROM cloud_desktops ORDER BY sort_order, id",
    [],
    staticDesktops,
    mapDesktopRow
  );

  const response = jsonResponse(desktops);
  // Cache desktop list for 60 seconds at CDN level
  response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return response;
};
