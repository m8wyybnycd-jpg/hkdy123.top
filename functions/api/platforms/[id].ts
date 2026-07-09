import { jsonResponse, unauthorized, notFound, requireAuth } from "../../lib/response";
import { queryOneWithFallback, parseJsonArray } from "../../lib/db";
import { platforms as staticPlatforms, platformMap } from "../../../src/data/platforms";
import type { Platform, PlatformId } from "../../../src/types";

/**
 * Maps a D1 row (snake_case) to a Platform object (camelCase).
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
 * GET /api/platforms/:id
 *
 * Returns a single platform by ID.
 * Tries D1 first, falls back to static TS data.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const user = requireAuth(context.data);
  if (!user) {
    return unauthorized();
  }

  const id = context.params.id;
  if (!id) {
    return notFound("平台不存在");
  }

  const platform = await queryOneWithFallback<Platform>(
    context.env.DB,
    "SELECT id, name, color, price, free_info, url, description, tags, activity FROM platforms WHERE id = ?",
    [id],
    platformMap[id] ?? null,
    mapPlatformRow
  );

  if (!platform) {
    return notFound("平台不存在");
  }

  return jsonResponse(platform);
};
