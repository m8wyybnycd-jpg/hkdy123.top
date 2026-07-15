/**
 * Consumption control type definitions.
 *
 * Used by the admin Consumption page and API client.
 * Maps to the `user_quotas` and `rate_limits` D1 tables.
 */

// ── User Quota Types ──────────────────────────────────────

/** A user quota record with real-time usage. */
export interface UserQuota {
  /** Numeric quota ID. */
  id: number;
  /** User ID. */
  userId: number;
  /** Daily token limit. */
  dailyLimit: number;
  /** Monthly token limit. */
  monthlyLimit: number;
  /** Current daily usage (stored counter). */
  currentDailyUsage: number;
  /** Current monthly usage (stored counter). */
  currentMonthlyUsage: number;
  /** Real-time daily usage (computed from token_usage_logs, may be null). */
  realtimeDailyUsage: number | null;
  /** Real-time monthly usage (computed from token_usage_logs, may be null). */
  realtimeMonthlyUsage: number | null;
  /** Last daily reset date (YYYY-MM-DD). */
  lastResetDate: string | null;
  /** Last monthly reset month (YYYY-MM). */
  lastResetMonth: string | null;
  /** Whether the user has unlimited quota. */
  isUnlimited: boolean;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
  /** User email (joined from users table). */
  email?: string;
  /** Whether this is a default quota (no explicit record exists). */
  isDefault?: boolean;
}

/** Payload for creating a single user's quota. */
export interface CreateQuotaPayload {
  userId: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  isUnlimited?: boolean;
}

/** Payload for updating a single user's quota. */
export interface UpdateQuotaPayload {
  dailyLimit?: number;
  monthlyLimit?: number;
  isUnlimited?: boolean;
}

/** A single item in a batch quota update. */
export interface BatchQuotaItem {
  userId: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  isUnlimited?: boolean;
  /** If true, reset usage counters to 0. */
  resetUsage?: boolean;
}

/** Batch quota update payload. */
export interface BatchQuotaPayload {
  quotas: BatchQuotaItem[];
}

/** Batch quota update result. */
export interface BatchQuotaResult {
  /** Number of successfully updated users. */
  successCount: number;
  /** Number of failed updates. */
  failureCount: number;
  /** Successfully updated user IDs. */
  successes: number[];
  /** Failed updates with reasons. */
  failures: { userId: number; reason: string }[];
}

// ── Rate Limit Types ──────────────────────────────────────

/** A rate limit rule. */
export interface RateLimit {
  /** Numeric rule ID. */
  id: number;
  /** Human-readable rule name. */
  name: string;
  /** Endpoint pattern (glob, e.g. "/api/ai/*"). */
  endpointPattern: string;
  /** HTTP method filter ("ALL" or specific method). */
  method: string;
  /** Maximum requests allowed in the window. */
  maxRequests: number;
  /** Time window in seconds. */
  windowSeconds: number;
  /** Whether the limit is per-user (true) or global (false). */
  perUser: boolean;
  /** Whether the rule is enabled. */
  enabled: boolean;
  /** Creation timestamp. */
  createdAt: string;
  /** Last update timestamp. */
  updatedAt: string;
}

/** Payload for creating a rate limit rule. */
export interface CreateRateLimitPayload {
  name: string;
  endpointPattern: string;
  method?: string;
  maxRequests: number;
  windowSeconds: number;
  perUser?: boolean;
  enabled?: boolean;
}

/** Payload for updating a rate limit rule (all fields optional). */
export interface UpdateRateLimitPayload {
  name?: string;
  endpointPattern?: string;
  method?: string;
  maxRequests?: number;
  windowSeconds?: number;
  perUser?: boolean;
  enabled?: boolean;
}

/** Valid HTTP methods for rate limit rules. */
export const RATE_LIMIT_METHODS = ["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"] as const;
