/**
 * Consumption Guard — Unified gatekeeper for all AI/Token consumption APIs.
 *
 * This module is the single enforcement point for:
 *   1. Quota checking (daily + monthly limits from user_quotas)
 *   2. Rate limiting (sliding-window via D1, rules from rate_limits)
 *   3. Usage recording (token_usage_logs + user_quotas update)
 *   4. Quota auto-reset (daily/monthly)
 *
 * Designed for Cloudflare Workers / Pages Functions (D1 only, no Redis).
 *
 * Usage pattern in AI endpoints:
 * ```typescript
 * import { consumptionGuard, recordTokenUsage } from "../../lib/consumption-guard";
 *
 * const guard = await consumptionGuard(request, env, userId);
 * if (!guard.allowed) {
 *   return new Response(JSON.stringify({ code: guard.code, message: guard.reason, data: null }), {
 *     status: guard.statusCode,
 *     headers: { "Content-Type": "application/json" },
 *   });
 * }
 * // ... call AI API ...
 * await recordTokenUsage(env.DB, { userId, model, endpoint, tokensIn, tokensOut, ... });
 * ```
 */

// ── Types ────────────────────────────────────────────────

/** Result of a consumption guard check. */
export interface ConsumptionGuardResult {
  /** Whether the request is allowed to proceed. */
  allowed: boolean;
  /** HTTP status code to return if blocked (e.g. 429). */
  statusCode: number;
  /** Internal error code for the response envelope. */
  code: number;
  /** Human-readable reason if blocked. */
  reason?: string;
  /** Quota info snapshot at the time of the check. */
  quota?: QuotaSnapshot;
  /** Matched rate-limit rule (if any). */
  rateLimitRule?: RateLimitRuleInfo;
}

/** Snapshot of a user's quota at the time of guard check. */
export interface QuotaSnapshot {
  dailyLimit: number;
  monthlyLimit: number;
  currentDailyUsage: number;
  currentMonthlyUsage: number;
  isUnlimited: boolean;
}

/** Matched rate-limit rule metadata. */
export interface RateLimitRuleInfo {
  id: number;
  name: string;
  maxRequests: number;
  windowSeconds: number;
}

/** Parameters for recording a token usage log entry. */
export interface RecordUsageParams {
  userId: number;
  credentialId?: number | null;
  model?: string | null;
  endpoint: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  cost?: number;
  ip?: string | null;
  userAgent?: string | null;
  status?: string;
  blockReason?: string | null;
}

// ── Default quota values ─────────────────────────────────

const DEFAULT_DAILY_LIMIT = 10000;
const DEFAULT_MONTHLY_LIMIT = 100000;

// ── Token cost estimation (RMB per 1K tokens) ────────────
// These rates are rough estimates for cost reporting.
// Adjust based on actual provider pricing.

const COST_PER_1K_TOKENS_IN = 0.004;   // ~¥0.03 per 1K input tokens
const COST_PER_1K_TOKENS_OUT = 0.012;  // ~¥0.09 per 1K output tokens

/**
 * Estimate cost in RMB based on token counts.
 */
export function estimateCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1000) * COST_PER_1K_TOKENS_IN + (tokensOut / 1000) * COST_PER_1K_TOKENS_OUT;
}

/**
 * Estimate token count from a text string (rough: ~1 token per 4 chars for CJK, ~1 per 4 chars for Latin).
 * This is a conservative estimate used for pre-call logging.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Rough heuristic: 1 token ≈ 2-3 characters for mixed CJK/Latin
  return Math.ceil(text.length / 2);
}

// ── Quota Management ─────────────────────────────────────

/**
 * Ensure a user_quotas row exists for the given user.
 * If none exists, create one with default values.
 *
 * @returns The quota row (existing or newly created).
 */
async function ensureQuotaExists(
  db: D1Database,
  userId: number
): Promise<Record<string, unknown>> {
  const existing = await db
    .prepare("SELECT * FROM user_quotas WHERE user_id = ?")
    .bind(userId)
    .first<Record<string, unknown>>();

  if (existing) return existing;

  // Create default quota row
  const now = new Date().toISOString();
  const todayDate = now.split("T")[0];
  const thisMonth = todayDate.slice(0, 7);

  await db
    .prepare(
      `INSERT INTO user_quotas
        (user_id, daily_limit, monthly_limit, current_daily_usage, current_monthly_usage,
         last_reset_date, last_reset_month, is_unlimited, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, ?, ?, 0, ?, ?)`
    )
    .bind(userId, DEFAULT_DAILY_LIMIT, DEFAULT_MONTHLY_LIMIT, todayDate, thisMonth, now, now)
    .run();

  return await db
    .prepare("SELECT * FROM user_quotas WHERE user_id = ?")
    .bind(userId)
    .first<Record<string, unknown>>() as Record<string, unknown>;
}

/**
 * Reset daily/monthly usage counters if they are stale.
 *
 * Compares last_reset_date with today, and last_reset_month with current month.
 * If either is stale, resets the corresponding counter and updates the timestamp.
 */
async function resetQuotaIfNeeded(
  db: D1Database,
  quotaRow: Record<string, unknown>
): Promise<QuotaSnapshot> {
  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];
  const thisMonth = todayDate.slice(0, 7);
  const nowIso = now.toISOString();

  const userId = quotaRow.user_id as number;
  const lastResetDate = (quotaRow.last_reset_date as string) ?? todayDate;
  const lastResetMonth = (quotaRow.last_reset_month as string) ?? thisMonth;

  let currentDailyUsage = (quotaRow.current_daily_usage as number) ?? 0;
  let currentMonthlyUsage = (quotaRow.current_monthly_usage as number) ?? 0;

  const needsDailyReset = lastResetDate !== todayDate;
  const needsMonthlyReset = lastResetMonth !== thisMonth;

  if (needsDailyReset || needsMonthlyReset) {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (needsDailyReset) {
      updates.push("current_daily_usage = 0");
      updates.push("last_reset_date = ?");
      params.push(todayDate);
      currentDailyUsage = 0;

      // If daily reset also crosses into a new month, reset monthly too
      if (needsMonthlyReset) {
        updates.push("current_monthly_usage = 0");
        updates.push("last_reset_month = ?");
        params.push(thisMonth);
        currentMonthlyUsage = 0;
      }
    } else if (needsMonthlyReset) {
      updates.push("current_monthly_usage = 0");
      updates.push("last_reset_month = ?");
      params.push(thisMonth);
      currentMonthlyUsage = 0;
    }

    updates.push("updated_at = ?");
    params.push(nowIso);
    params.push(userId);

    await db
      .prepare(`UPDATE user_quotas SET ${updates.join(", ")} WHERE user_id = ?`)
      .bind(...params)
      .run();
  }

  return {
    dailyLimit: (quotaRow.daily_limit as number) ?? DEFAULT_DAILY_LIMIT,
    monthlyLimit: (quotaRow.monthly_limit as number) ?? DEFAULT_MONTHLY_LIMIT,
    currentDailyUsage,
    currentMonthlyUsage,
    isUnlimited: (quotaRow.is_unlimited as number) === 1,
  };
}

/**
 * Check if the user has remaining quota (daily + monthly).
 *
 * @returns null if allowed, or a block reason string if quota exceeded.
 */
async function checkQuota(
  db: D1Database,
  userId: number
): Promise<{ snapshot: QuotaSnapshot; blockReason: string | null }> {
  const quotaRow = await ensureQuotaExists(db, userId);
  const snapshot = await resetQuotaIfNeeded(db, quotaRow);

  if (snapshot.isUnlimited) {
    return { snapshot, blockReason: null };
  }

  if (snapshot.currentDailyUsage >= snapshot.dailyLimit) {
    return {
      snapshot,
      blockReason: `日配额已用尽（${snapshot.currentDailyUsage}/${snapshot.dailyLimit}）`,
    };
  }

  if (snapshot.currentMonthlyUsage >= snapshot.monthlyLimit) {
    return {
      snapshot,
      blockReason: `月配额已用尽（${snapshot.currentMonthlyUsage}/${snapshot.monthlyLimit}）`,
    };
  }

  return { snapshot, blockReason: null };
}

// ── Rate Limiting (D1 sliding window) ────────────────────

/**
 * Find the first enabled rate-limit rule that matches the given endpoint and method.
 *
 * Matching logic: endpoint_pattern supports glob-style wildcards (e.g. "/api/ai/*").
 * Method "ALL" matches any HTTP method.
 */
async function findMatchingRateLimitRule(
  db: D1Database,
  endpoint: string,
  method: string
): Promise<RateLimitRuleInfo | null> {
  try {
    const result = await db
      .prepare(
        `SELECT id, name, endpoint_pattern, method, max_requests, window_seconds
         FROM rate_limits
         WHERE enabled = 1
         ORDER BY id ASC`
      )
      .all<Record<string, unknown>>();

    for (const row of result.results || []) {
      const pattern = row.endpoint_pattern as string;
      const ruleMethod = (row.method as string) ?? "ALL";

      // Method check: "ALL" matches everything
      if (ruleMethod !== "ALL" && ruleMethod !== method.toUpperCase()) {
        continue;
      }

      // Pattern check: convert glob to regex
      // "*" → ".*", escape other regex special chars
      const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");

      const regex = new RegExp(`^${regexPattern}$`, "i");

      if (regex.test(endpoint)) {
        return {
          id: row.id as number,
          name: row.name as string,
          maxRequests: row.max_requests as number,
          windowSeconds: row.window_seconds as number,
        };
      }
    }
  } catch (err) {
    console.error("[consumption-guard] Failed to query rate limits:", err);
  }

  return null;
}

/**
 * Check rate limit using a D1-based sliding window.
 *
 * Counts the number of token_usage_logs entries for this user+endpoint
 * within the rule's time window. If the count exceeds max_requests, block.
 *
 * @returns true if allowed, false if rate-limited.
 */
async function checkRateLimit(
  db: D1Database,
  userId: number,
  endpoint: string,
  rule: RateLimitRuleInfo
): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        `SELECT COUNT(*) as cnt FROM token_usage_logs
         WHERE user_id = ? AND endpoint = ?
         AND created_at > datetime('now', ?)`
      )
      .bind(userId, endpoint, `-${rule.windowSeconds} seconds`)
      .first<{ cnt: number }>();

    const count = result?.cnt ?? 0;
    return count < rule.maxRequests;
  } catch (err) {
    // If the rate-limit check fails (e.g. table not yet migrated),
    // allow the request through but log the error.
    console.error("[consumption-guard] Rate limit check failed, allowing request:", err);
    return true;
  }
}

// ── Main Guard Function ──────────────────────────────────

/**
 * The unified consumption guard. Call this before any AI/Token consumption.
 *
 * Performs:
 *   1. Quota check (daily + monthly)
 *   2. Rate limit check (sliding window via D1)
 *
 * Does NOT record usage — call `recordTokenUsage()` separately after the
 * AI API call completes to log actual token consumption.
 *
 * @param request      - The incoming request (used for endpoint/method extraction)
 * @param env          - Cloudflare environment bindings
 * @param userId       - Authenticated user ID
 * @param credentialId - Optional credential ID for logging
 * @returns ConsumptionGuardResult indicating whether to allow or block
 */
export async function consumptionGuard(
  request: Request,
  env: Env,
  userId: number,
  credentialId?: number | null
): Promise<ConsumptionGuardResult> {
  const db = env.DB;
  if (!db) {
    return {
      allowed: false,
      statusCode: 500,
      code: 50000,
      reason: "数据库不可用",
    };
  }

  // Extract endpoint path and HTTP method
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const method = request.method;

  // ── 1. Quota Check ──
  let quota: QuotaSnapshot;
  try {
    const quotaResult = await checkQuota(db, userId);
    quota = quotaResult.snapshot;

    if (quotaResult.blockReason) {
      return {
        allowed: false,
        statusCode: 429,
        code: 42901,
        reason: quotaResult.blockReason,
        quota,
      };
    }
  } catch (err) {
    console.error("[consumption-guard] Quota check failed:", err);
    // Fail open: if quota check errors, allow the request (table may not exist yet)
    quota = {
      dailyLimit: DEFAULT_DAILY_LIMIT,
      monthlyLimit: DEFAULT_MONTHLY_LIMIT,
      currentDailyUsage: 0,
      currentMonthlyUsage: 0,
      isUnlimited: false,
    };
  }

  // ── 2. Rate Limit Check ──
  let rateLimitRule: RateLimitRuleInfo | null = null;
  try {
    rateLimitRule = await findMatchingRateLimitRule(db, endpoint, method);

    if (rateLimitRule) {
      const allowed = await checkRateLimit(db, userId, endpoint, rateLimitRule);
      if (!allowed) {
        return {
          allowed: false,
          statusCode: 429,
          code: 42902,
          reason: `请求过于频繁，请稍后再试（限制：${rateLimitRule.maxRequests}次/${rateLimitRule.windowSeconds}秒）`,
          quota,
          rateLimitRule,
        };
      }
    }
  } catch (err) {
    console.error("[consumption-guard] Rate limit check failed:", err);
    // Fail open: if rate-limit check errors, allow the request
  }

  return {
    allowed: true,
    statusCode: 200,
    code: 0,
    quota,
    rateLimitRule: rateLimitRule ?? undefined,
  };
}

// ── Usage Recording ──────────────────────────────────────

/**
 * Record a token usage entry and update the user's quota counters.
 *
 * This should be called AFTER the AI API call completes, with actual
 * token consumption data extracted from the API response.
 *
 * If `totalTokens` is 0, this function still inserts a log row (for
 * blocked/failed requests) but does NOT increment quota counters.
 *
 * @param db     - D1 database binding
 * @param params - Usage recording parameters
 */
export async function recordTokenUsage(
  db: D1Database,
  params: RecordUsageParams
): Promise<void> {
  const now = new Date().toISOString();
  const status = params.status ?? "success";
  const cost = params.cost ?? estimateCost(params.tokensIn, params.tokensOut);

  try {
    // Insert usage log
    await db
      .prepare(
        `INSERT INTO token_usage_logs
          (user_id, credential_id, model, endpoint, tokens_in, tokens_out,
           total_tokens, cost, ip, user_agent, status, block_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.userId,
        params.credentialId ?? null,
        params.model ?? null,
        params.endpoint,
        params.tokensIn,
        params.tokensOut,
        params.totalTokens,
        cost,
        params.ip ?? null,
        params.userAgent ?? null,
        status,
        params.blockReason ?? null,
        now
      )
      .run();

    // Update quota counters only for successful consumption with non-zero tokens
    if (status === "success" && params.totalTokens > 0) {
      // Ensure quota row exists, then increment
      await ensureQuotaExists(db, params.userId);

      await db
        .prepare(
          `UPDATE user_quotas
           SET current_daily_usage = current_daily_usage + ?,
               current_monthly_usage = current_monthly_usage + ?,
               updated_at = ?
           WHERE user_id = ?`
        )
        .bind(params.totalTokens, params.totalTokens, now, params.userId)
        .run();
    }
  } catch (err) {
    // Usage recording failure should not block the response.
    console.error("[consumption-guard] Failed to record token usage:", err);
  }
}

/**
 * Record a blocked request (for rate-limit/quota-exceeded audit trail).
 *
 * Inserts a token_usage_logs row with status='blocked' and the block reason,
 * without incrementing quota counters.
 */
export async function recordBlockedRequest(
  db: D1Database,
  params: {
    userId: number;
    endpoint: string;
    reason: string;
    ip?: string | null;
    userAgent?: string | null;
  }
): Promise<void> {
  await recordTokenUsage(db, {
    userId: params.userId,
    endpoint: params.endpoint,
    tokensIn: 0,
    tokensOut: 0,
    totalTokens: 0,
    cost: 0,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
    status: "blocked",
    blockReason: params.reason,
  });
}
