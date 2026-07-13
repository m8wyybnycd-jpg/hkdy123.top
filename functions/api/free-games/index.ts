import { jsonResponse } from "../../lib/response";
import { queryWithFallback, parseJsonArray } from "../../lib/db";
import { freeGames as staticFreeGames } from "../../../src/data/freeGames";
import type { FreeGame } from "../../../src/types";

/**
 * Maps a D1 row (snake_case) to a FreeGame object (camelCase).
 */
function mapFreeGameRow(row: Record<string, unknown>): FreeGame {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as string,
    platform: row.platform as string,
    description: row.description as string,
    quarkLink: (row.quark_link as string) ?? "",
    emoji: (row.emoji as string) ?? "",
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

/**
 * GET /api/free-games
 *
 * Returns all free single-player game resources.
 * Tries D1 first, falls back to static TS data.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const items = await queryWithFallback<FreeGame>(
    context.env.DB,
    "SELECT id, name, type, platform, description, quark_link, emoji, sort_order FROM free_games ORDER BY sort_order, id",
    [],
    staticFreeGames,
    mapFreeGameRow
  );

  const response = jsonResponse(items);
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=300"
  );
  return response;
};
