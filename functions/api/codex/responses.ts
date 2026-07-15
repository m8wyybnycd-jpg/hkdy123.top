/**
 * Codex CLI API Proxy — Responses API transparent forwarder with auth + quota enforcement.
 *
 * POST /api/codex/responses
 *
 * This is the core of the Codex CLI level system. Codex CLI sends Responses API
 * requests here (configured via base_url in config.toml). The proxy:
 *   1. Verifies JWT from Authorization header (Codex CLI uses env_key → Bearer token)
 *   2. Checks JWT revocation blacklist (KV)
 *   3. Runs consumption guard (quota + rate limit)
 *   4. Applies level-based model restrictions (3-tier: trial/standard/pro)
 *   5. Fetches OpenAI API key from D1 credentials (encrypted, never on client)
 *   6. Forwards request to OpenAI Responses API
 *   7. Transparently forwards SSE stream back to Codex CLI
 *   8. Extracts usage data from response.completed event for billing
 *
 * Architecture: A+C scheme from expert deliberation
 *   A = API Proxy (this file)
 *   C = Codex CLI subprocess (Electron shell manages config.toml)
 *
 * Key design: The proxy is a transparent SSE forwarder. It does NOT parse
 * Responses API protocol content — it only intercepts the `response.completed`
 * event to extract usage tokens. Everything else passes through unchanged.
 */

import { verifyJWTAny, getJWTSecrets, JWTPayload } from "../../lib/auth";
import { isTokenRevoked } from "../../lib/revocation";
import {
  consumptionGuard,
  recordTokenUsage,
  recordBlockedRequest,
} from "../../lib/consumption-guard";
import { getCredentialByProvider } from "../../lib/credential";
import { getClientIP, getUserAgent } from "../../lib/logger";

// ── 3-Tier Level Configuration ───────────────────────────

interface TierConfig {
  name: string;
  minLevel: number;
  maxLevel: number;
  allowedModels: string[];
  defaultModel: string;
  maxOutputTokens: number;
  /** Reasoning effort cap */
  maxReasoningEffort: "low" | "medium" | "high";
}

const TIER_CONFIGS: TierConfig[] = [
  {
    name: "trial",
    minLevel: 1,
    maxLevel: 3,
    allowedModels: ["gpt-4o-mini", "gpt-4o"],
    defaultModel: "gpt-4o-mini",
    maxOutputTokens: 4096,
    maxReasoningEffort: "low",
  },
  {
    name: "standard",
    minLevel: 4,
    maxLevel: 7,
    allowedModels: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
    defaultModel: "gpt-4o",
    maxOutputTokens: 16384,
    maxReasoningEffort: "medium",
  },
  {
    name: "pro",
    minLevel: 8,
    maxLevel: 10,
    allowedModels: ["gpt-5.5", "gpt-4o", "gpt-4o-mini", "o3-mini", "o3"],
    defaultModel: "gpt-5.5",
    maxOutputTokens: 32768,
    maxReasoningEffort: "high",
  },
];

/** Get tier config for a given user level (1-10). */
function getTierForLevel(level: number): TierConfig {
  for (const tier of TIER_CONFIGS) {
    if (level >= tier.minLevel && level <= tier.maxLevel) {
      return tier;
    }
  }
  // Default to trial for unknown levels
  return TIER_CONFIGS[0];
}

// ── OpenAI API Configuration ─────────────────────────────

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const CODEX_ENDPOINT = "/api/codex/responses";

// ── Helpers ──────────────────────────────────────────────

/**
 * Extract JWT from Authorization: Bearer header.
 * Codex CLI uses env_key → sends token as Bearer in Authorization header.
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Create an OpenAI-compatible error response.
 * Codex CLI expects Responses API error format.
 */
function openaiError(
  status: number,
  type: string,
  code: string,
  message: string
): Response {
  return new Response(
    JSON.stringify({
      error: {
        type,
        code,
        message,
        param: null,
        status,
      },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ── Usage Extraction from SSE Stream ─────────────────────

interface ExtractedUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string | null;
}

/**
 * Create a TransformStream that:
 *   1. Transparently forwards all SSE data to the client
 *   2. Intercepts `response.completed` events to extract usage data
 *
 * The stream is not modified — only observed. Usage data is captured
 * in a closure variable and recorded after the stream ends.
 */
function createSSEForwardingStream(
  usageRef: { value: ExtractedUsage | null }
): { readable: ReadableStream; writable: WritableStream } {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new TransformStream({
    transform(chunk: Uint8Array, controller: TransformStreamDefaultController) {
      const text = decoder.decode(chunk, { stream: true });
      buffer += text;

      // Split by double newline (SSE event boundary)
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || ""; // Keep incomplete part in buffer

      for (const part of parts) {
        // Forward the complete event as-is
        controller.enqueue(encoder.encode(part + "\n\n"));

        // Try to extract usage from response.completed events
        if (usageRef.value) continue; // Already captured

        // Check if this is a data line containing response.completed
        const lines = part.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            // response.completed event contains the full response object
            if (data.type === "response.completed" && data.response) {
              const usage = data.response.usage;
              if (usage) {
                usageRef.value = {
                  inputTokens: usage.input_tokens || 0,
                  outputTokens: usage.output_tokens || 0,
                  totalTokens: usage.total_tokens || 0,
                  model: data.response.model || null,
                };
              }
            }
          } catch {
            // Not JSON or not the event we're looking for — ignore
          }
        }
      }
    },

    flush(controller: TransformStreamDefaultController) {
      // Forward any remaining buffered data
      if (buffer.length > 0) {
        controller.enqueue(encoder.encode(buffer));
      }
    },
  });
}

// ── Main Handler ─────────────────────────────────────────

export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const { request, env, waitUntil } = context;
  const DB = env.DB;

  // ── 0. Basic validation ──
  if (!DB) {
    return openaiError(503, "server_error", "db_unavailable", "Service database unavailable");
  }

  // ── 1. Extract and verify JWT ──
  const token = extractBearerToken(request);
  if (!token) {
    return openaiError(401, "invalid_request_error", "missing_token", "Missing Authorization Bearer token");
  }

  let payload: JWTPayload;
  try {
    const secrets = getJWTSecrets(env);
    payload = await verifyJWTAny(token, secrets);
  } catch {
    return openaiError(401, "invalid_request_error", "invalid_token", "Invalid or expired token");
  }

  // ── 2. Check JWT revocation blacklist ──
  const kvConfigured = !!env.TOKEN_BLACKLIST;
  if (payload.jti) {
    const revoked = await isTokenRevoked(env.TOKEN_BLACKLIST!, payload.jti, kvConfigured);
    if (revoked) {
      return openaiError(401, "invalid_request_error", "token_revoked", "Token has been revoked");
    }
  }

  const userId = payload.userId;
  const clientIP = getClientIP(request);
  const userAgent = getUserAgent(request);

  // ── 3. Parse request body ──
  let requestBody: Record<string, unknown>;
  try {
    requestBody = await request.json();
  } catch {
    return openaiError(400, "invalid_request_error", "invalid_json", "Request body is not valid JSON");
  }

  // Codex CLI always uses stream: true — verify
  const isStreaming = requestBody.stream === true;

  // ── 4. Consumption guard (quota + rate limit) ──
  const guard = await consumptionGuard(request, env, userId);
  if (!guard.allowed) {
    // Record blocked request for audit
    waitUntil(
      recordBlockedRequest(DB, {
        userId,
        endpoint: CODEX_ENDPOINT,
        reason: guard.reason || "quota_exceeded",
        ip: clientIP,
        userAgent,
      })
    );

    return openaiError(
      guard.statusCode,
      guard.statusCode === 429 ? "rate_limit_exceeded" : "server_error",
      guard.code === 42901 ? "quota_exceeded" : "rate_limit_exceeded",
      guard.reason || "Request blocked"
    );
  }

  // ── 5. Determine user level and apply tier restrictions ──
  let userLevel = 1;
  try {
    const userRow = await DB.prepare("SELECT COALESCE(level, 1) AS level FROM users WHERE id = ?")
      .bind(userId)
      .first<{ level: number }>();
    userLevel = userRow?.level ?? 1;
  } catch {
    // If we can't read the level, default to trial (most restrictive)
    console.warn("[codex-proxy] Failed to read user level, defaulting to trial");
  }

  const tier = getTierForLevel(userLevel);

  // Apply model restrictions
  const requestedModel = (requestBody.model as string) || tier.defaultModel;

  // If requested model not in allowed list, downgrade to tier default
  if (!tier.allowedModels.includes(requestedModel)) {
    requestBody.model = tier.defaultModel;
  }

  // Cap max_output_tokens
  const requestedMaxTokens = (requestBody.max_output_tokens as number) || 0;
  if (requestedMaxTokens === 0 || requestedMaxTokens > tier.maxOutputTokens) {
    requestBody.max_output_tokens = tier.maxOutputTokens;
  }

  // Cap reasoning effort
  if (requestBody.reasoning && typeof requestBody.reasoning === "object") {
    const effort = (requestBody.reasoning as Record<string, unknown>).effort as string;
    const effortOrder = ["low", "medium", "high"];
    const requestedIdx = effortOrder.indexOf(effort);
    const maxIdx = effortOrder.indexOf(tier.maxReasoningEffort);
    if (requestedIdx > maxIdx) {
      (requestBody.reasoning as Record<string, unknown>).effort = tier.maxReasoningEffort;
    }
  }

  // Ensure stream is true (Codex CLI always streams)
  requestBody.stream = true;

  // ── 6. Get OpenAI API key from D1 credentials ──
  let openaiApiKey: string;
  try {
    openaiApiKey = await getCredentialByProvider(DB, env.ENCRYPTION_MASTER_KEY || env.JWT_SECRET, "openai", "OPENAI_API_KEY");
  } catch {
    return openaiError(503, "server_error", "credential_unavailable", "AI service credential not configured");
  }

  if (!openaiApiKey) {
    return openaiError(503, "server_error", "credential_missing", "OpenAI API key not found in credential store");
  }

  // ── 7. Forward to OpenAI Responses API ──
  const upstreamResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
      "Accept": isStreaming ? "text/event-stream" : "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  // ── 8. Handle non-OK upstream response ──
  if (!upstreamResponse.ok) {
    // Forward the error as-is (OpenAI error format is already compatible)
    const errorBody = await upstreamResponse.text();
    return new Response(errorBody, {
      status: upstreamResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 9. Handle non-streaming response ──
  if (!isStreaming) {
    const body = await upstreamResponse.text();

    // Extract usage from non-streaming response
    let usage: ExtractedUsage | null = null;
    try {
      const data = JSON.parse(body);
      if (data.usage) {
        usage = {
          inputTokens: data.usage.input_tokens || 0,
          outputTokens: data.usage.output_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          model: data.model || null,
        };
      }
    } catch {
      // Can't parse — still return the body
    }

    // Record usage asynchronously
    if (usage && usage.totalTokens > 0) {
      waitUntil(
        recordTokenUsage(DB, {
          userId,
          endpoint: CODEX_ENDPOINT,
          model: usage.model,
          tokensIn: usage.inputTokens,
          tokensOut: usage.outputTokens,
          totalTokens: usage.totalTokens,
          ip: clientIP,
          userAgent,
          status: "success",
        })
      );
    }

    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 10. Streaming SSE: transparent forward with usage extraction ──
  if (!upstreamResponse.body) {
    return openaiError(500, "server_error", "no_stream_body", "Upstream returned no stream body");
  }

  const usageRef: { value: ExtractedUsage | null } = { value: null };
  const { readable, writable } = createSSEForwardingStream(usageRef);

  // Pipe upstream body through our transform
  // Using waitUntil to ensure the stream completes even if the request is aborted
  upstreamResponse.body.pipeTo(writable).catch((err) => {
    console.error("[codex-proxy] Stream pipe error:", err);
  });

  // Record usage after stream completes (via waitUntil)
  // We use a separate promise that waits for the stream to settle
  const usagePromise = new Promise<void>((resolve) => {
    // Poll for usageRef to be populated (max 5 minutes)
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (usageRef.value || Date.now() - startTime > 300000) {
        clearInterval(interval);
        if (usageRef.value && usageRef.value.totalTokens > 0) {
          recordTokenUsage(DB, {
            userId,
            endpoint: CODEX_ENDPOINT,
            model: usageRef.value.model,
            tokensIn: usageRef.value.inputTokens,
            tokensOut: usageRef.value.outputTokens,
            totalTokens: usageRef.value.totalTokens,
            ip: clientIP,
            userAgent,
            status: "success",
          }).finally(resolve);
        } else {
          resolve();
        }
      }
    }, 1000);
  });
  waitUntil(usagePromise);

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
};

// ── Health check (GET) ───────────────────────────────────

export const onRequestGet = async (): Promise<Response> => {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "codex-proxy",
      version: "1.0.0",
      protocol: "responses-api",
      tiers: TIER_CONFIGS.map((t) => ({
        name: t.name,
        levels: `${t.minLevel}-${t.maxLevel}`,
        defaultModel: t.defaultModel,
        maxOutputTokens: t.maxOutputTokens,
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
