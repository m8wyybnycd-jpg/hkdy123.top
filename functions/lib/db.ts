/**
 * D1 database query utilities with static data fallback.
 *
 * All content APIs use `queryWithFallback` to try D1 first and
 * gracefully fall back to bundled static TS data when D1 is
 * unavailable, empty, or throws an error.
 */

/**
 * Query D1 and fall back to static data if the query fails or returns no rows.
 *
 * @param db      - D1Database binding (may be undefined in dev without wrangler)
 * @param sql     - SQL query string
 * @param params  - Bind parameters
 * @param fallback - Static data to return if D1 is unavailable or empty
 * @param mapper  - Optional mapper to convert raw D1 rows to typed objects
 * @returns Array of typed results
 */
export async function queryWithFallback<T>(
  db: D1Database | undefined,
  sql: string,
  params: unknown[],
  fallback: T[],
  mapper?: (row: Record<string, unknown>) => T
): Promise<T[]> {
  if (!db) return fallback;
  try {
    const stmt = db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.all();
    if (!result.results || result.results.length === 0) {
      return fallback;
    }
    if (mapper) {
      return result.results.map((row) => mapper(row as Record<string, unknown>));
    }
    return result.results as T[];
  } catch {
    return fallback;
  }
}

/**
 * Query a single row from D1 with fallback.
 *
 * @param db       - D1Database binding
 * @param sql      - SQL query string
 * @param params   - Bind parameters
 * @param fallback - Static data to return if D1 is unavailable or row not found
 * @param mapper   - Optional mapper to convert raw D1 row to typed object
 * @returns Single typed result or fallback
 */
export async function queryOneWithFallback<T>(
  db: D1Database | undefined,
  sql: string,
  params: unknown[],
  fallback: T | null,
  mapper?: (row: Record<string, unknown>) => T
): Promise<T | null> {
  if (!db) return fallback;
  try {
    const result = await db.prepare(sql).bind(...params).first();
    if (!result) return fallback;
    if (mapper) return mapper(result as Record<string, unknown>);
    return result as T;
  } catch {
    return fallback;
  }
}

/**
 * Execute a D1 statement (INSERT/UPDATE/DELETE) and return success status.
 *
 * @param db    - D1Database binding
 * @param sql   - SQL statement
 * @param params - Bind parameters
 * @returns true if the statement succeeded, false otherwise
 */
export async function executeStatement(
  db: D1Database | undefined,
  sql: string,
  params: unknown[]
): Promise<boolean> {
  if (!db) return false;
  try {
    await db.prepare(sql).bind(...params).run();
    return true;
  } catch {
    return false;
  }
}

/** Parse a JSON column value, returning an empty array on failure. */
export function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
