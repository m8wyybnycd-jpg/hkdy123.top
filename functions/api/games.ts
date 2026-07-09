import { jsonResponse, unauthorized, requireAuth } from "../lib/response";
import { queryWithFallback, parseJsonArray } from "../lib/db";
import { games as staticGames } from "../../src/data/games";
import type { Game, GameType, Config, PlatformId } from "../../src/types";

/**
 * Maps a D1 row (snake_case) to a Game object (camelCase).
 * Parses the `platforms` and `tags` JSON columns into arrays.
 */
function mapGameRow(row: Record<string, unknown>): Game {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as GameType,
    rating: row.rating as number,
    config: row.config as Config,
    platforms: parseJsonArray(row.platforms) as PlatformId[],
    desc: (row.description as string) ?? "",
    reason: (row.reason as string) ?? "",
    tags: parseJsonArray(row.tags),
    emoji: row.emoji as string,
  };
}

/**
 * GET /api/games
 *
 * Returns all games.
 * Tries D1 first, falls back to static TS data.
 * (Games table is pre-built for future P1 migration; currently uses static data.)
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const user = requireAuth(context.data);
  if (!user) {
    return unauthorized();
  }

  const games = await queryWithFallback<Game>(
    context.env.DB,
    "SELECT id, name, type, rating, config, platforms, description, reason, tags, emoji FROM games ORDER BY sort_order, rating DESC",
    [],
    staticGames,
    mapGameRow
  );

  return jsonResponse(games);
};
