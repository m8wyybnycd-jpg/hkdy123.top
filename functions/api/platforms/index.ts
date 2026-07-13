import { jsonResponse } from "../../lib/response";
import { queryWithFallback, parseJsonArray } from "../../lib/db";
import { platforms as staticPlatforms } from "../../../src/data/platforms";
import type { Platform, PlatformId } from "../../../src/types";

/**
 * Maps a D1 row (snake_case) to a Platform object (camelCase).
 * Parses the `tags` JSON column into a string array.
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
 * GET /api/platforms
 *
 * Returns all cloud gaming platforms (10+).
 * Tries D1 first, falls back to static TS data.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const platforms = await queryWithFallback<Platform>(
    context.env.DB,
    "SELECT id, name, color, price, free_info, url, description, tags, activity FROM platforms ORDER BY sort_order, id",
    [],
    staticPlatforms,
    mapPlatformRow
  );

  const response = jsonResponse(platforms);
  // Cache platform list for 60 seconds at CDN level
  response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return response;
};
