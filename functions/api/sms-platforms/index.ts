import { jsonResponse } from "../../lib/response";
import { queryWithFallback, parseJsonArray } from "../../lib/db";
import { smsPlatforms as staticSmsPlatforms } from "../../../src/data/smsPlatforms";
import type { SmsPlatform } from "../../../src/types";

/**
 * Maps a D1 row (snake_case) to an SmsPlatform object (camelCase).
 * Boolean columns are stored as INTEGER (0/1).
 */
function mapSmsPlatformRow(row: Record<string, unknown>): SmsPlatform {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    category: row.category as string,
    countries: (row.countries as string) ?? "",
    isFree: (row.is_free as number) === 1,
    needRegister: (row.need_register as number) === 1,
    supportChinese: (row.support_chinese as number) === 1,
    retention: (row.retention as string) ?? "",
    description: (row.description as string) ?? "",
    features: parseJsonArray(row.features),
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

/**
 * GET /api/sms-platforms
 *
 * Returns all SMS-receiving / verification-code platforms.
 * Tries D1 first, falls back to static TS data.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const items = await queryWithFallback<SmsPlatform>(
    context.env.DB,
    "SELECT id, name, url, category, countries, is_free, need_register, support_chinese, retention, description, features, sort_order FROM sms_platforms ORDER BY sort_order, id",
    [],
    staticSmsPlatforms,
    mapSmsPlatformRow
  );

  const response = jsonResponse(items);
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, stale-while-revalidate=300"
  );
  return response;
};
