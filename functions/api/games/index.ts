import { jsonResponse, serverError, queryWithFallback } from "../../lib/db";
import { games as staticGames } from "../../../src/data/games";
import type { Game } from "../../../src/types";

/**
 * Map a D1 row (snake_case) to Game (camelCase).
 * platforms/tags are stored as JSON strings in D1.
 */
function mapGameRow(row: Record<string, unknown>): Game {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Game["type"],
    rating: row.rating as number,
    config: row.config as Game["config"],
    platforms: JSON.parse((row.platforms as string) || "[]"),
    desc: (row.description as string) ?? "",
    reason: (row.reason as string) ?? "",
    tags: JSON.parse((row.tags as string) || "[]"),
    emoji: (row.emoji as string) ?? "",
    cover: (row.cover as string) ?? undefined,
  };
}

/**
 * GET /api/games — public read endpoint.
 * Returns all enabled games sorted by sort_order ASC.
 * Falls back to static data if D1 is unavailable.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const sql = `SELECT id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order
               FROM games WHERE is_enabled = 1 ORDER BY sort_order ASC`;

  try {
    const result = await queryWithFallback<Game>(
      DB,
      sql,
      [],
      staticGames,
      mapGameRow
    );
    return jsonResponse(result, { "Cache-Control": "public, max-age=60" });
  } catch {
    return serverError("数据库查询失败");
  }
};
