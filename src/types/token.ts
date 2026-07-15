/**
 * Token usage tracking type definitions.
 *
 * Used by the admin Token management page and API client.
 * Maps to the `token_usage_logs` D1 table and the
 * `/api/admin/tokens/stats` + `/api/admin/tokens/usage` endpoints.
 */

/** Token usage record status. */
export type TokenUsageStatus = "success" | "blocked" | "error";

/** A single token usage log entry. */
export interface TokenUsageLog {
  /** Numeric log ID. */
  id: number;
  /** User ID that triggered the request. */
  userId: number;
  /** Credential ID used for the request (null if none). */
  credentialId: number | null;
  /** AI model name (e.g. "qwen-max"). */
  model: string | null;
  /** API endpoint path. */
  endpoint: string | null;
  /** Input tokens consumed. */
  tokensIn: number;
  /** Output tokens generated. */
  tokensOut: number;
  /** Total tokens (input + output). */
  totalTokens: number;
  /** Estimated cost in USD. */
  cost: number;
  /** Request IP address. */
  ip: string | null;
  /** User-Agent string. */
  userAgent: string | null;
  /** Request status. */
  status: TokenUsageStatus;
  /** Block reason (only set when status is "blocked"). */
  blockReason: string | null;
  /** Timestamp (ISO 8601). */
  createdAt: string;
}

/** Daily trend data point for the 30-day chart. */
export interface TokenDailyTrend {
  /** Date in YYYY-MM-DD format. */
  date: string;
  /** Total tokens consumed that day. */
  totalTokens: number;
  /** Input tokens. */
  totalTokensIn: number;
  /** Output tokens. */
  totalTokensOut: number;
  /** Cost that day. */
  totalCost: number;
  /** Number of requests. */
  requestCount: number;
  /** Successful request count. */
  successCount: number;
  /** Blocked request count. */
  blockedCount: number;
  /** Error request count. */
  errorCount: number;
}

/** Top user by token consumption. */
export interface TokenTopUser {
  /** User ID. */
  userId: number;
  /** User email. */
  email: string;
  /** Total tokens consumed. */
  totalTokens: number;
  /** Input tokens. */
  totalTokensIn: number;
  /** Output tokens. */
  totalTokensOut: number;
  /** Total cost. */
  totalCost: number;
  /** Number of requests. */
  requestCount: number;
  /** Average tokens per request. */
  avgTokensPerRequest: number;
}

/** Top model by token consumption. */
export interface TokenTopModel {
  /** Model name. */
  model: string;
  /** Total tokens consumed. */
  totalTokens: number;
  /** Input tokens. */
  totalTokensIn: number;
  /** Output tokens. */
  totalTokensOut: number;
  /** Total cost. */
  totalCost: number;
  /** Number of requests. */
  requestCount: number;
  /** Average tokens per request. */
  avgTokensPerRequest: number;
}

/** Hourly trend data point for today's 24-hour chart. */
export interface TokenHourlyTrend {
  /** Hour of day (0-23). */
  hour: number;
  /** Total tokens. */
  totalTokens: number;
  /** Cost. */
  totalCost: number;
  /** Number of requests. */
  requestCount: number;
}

/** Period summary statistics. */
export interface TokenPeriodStats {
  /** Total tokens. */
  totalTokens: number;
  /** Input tokens. */
  totalTokensIn: number;
  /** Output tokens. */
  totalTokensOut: number;
  /** Total cost. */
  totalCost: number;
  /** Number of requests. */
  requestCount: number;
  /** Unique active users. */
  uniqueUsers: number;
  /** Average tokens per request. */
  avgTokensPerRequest: number;
}

/** Status breakdown counts. */
export interface TokenStatusBreakdown {
  /** Success count and cost. */
  success: { count: number; cost: number };
  /** Blocked count and cost. */
  blocked: { count: number; cost: number };
  /** Error count and cost. */
  error: { count: number; cost: number };
}

/** Full token statistics response from GET /api/admin/tokens/stats. */
export interface TokenStats {
  /** Today's statistics. */
  today: TokenPeriodStats & {
    /** Estimated cost (fallback when stored cost is 0). */
    estimatedCost: number;
  };
  /** This month's statistics. */
  thisMonth: TokenPeriodStats;
  /** Last 30 days statistics. */
  last30Days: TokenPeriodStats & {
    /** Average cost per request. */
    avgCostPerRequest: number;
  };
  /** Top 10 users by consumption (last 30 days). */
  topUsers: TokenTopUser[];
  /** Top 10 models by consumption (last 30 days). */
  topModels: TokenTopModel[];
  /** Daily trend (last 30 days). */
  dailyTrend: TokenDailyTrend[];
  /** Today's hourly trend (24 data points). */
  todayHourlyTrend: TokenHourlyTrend[];
  /** Status breakdown (last 30 days). */
  statusBreakdown: TokenStatusBreakdown;
}

/** Query parameters for the token usage list endpoint. */
export interface TokenUsageQueryParams {
  /** Page number (1-based). */
  page?: number;
  /** Items per page. */
  pageSize?: number;
  /** Filter by user ID. */
  userId?: number;
  /** Filter by credential ID. */
  credentialId?: number;
  /** Filter by model name (fuzzy match). */
  model?: string;
  /** Filter by status. */
  status?: TokenUsageStatus;
  /** Date range start (ISO 8601). */
  dateFrom?: string;
  /** Date range end (ISO 8601). */
  dateTo?: string;
}
