/**
 * Cloudgame Hub — Credential Keepalive Worker
 *
 * Triggered by Cloudflare Cron every 30 minutes.
 *
 * Responsibilities:
 * 1. Iterate all active credentials in D1
 * 2. Perform health check (connectivity + auth test)
 * 3. Update credential status (active / error)
 * 4. Write health logs for audit trail
 * 5. Auto-renew OAuth tokens if renew_endpoint is configured
 * 6. Retry failed checks with exponential backoff (up to 2 retries)
 * 7. Mark credentials as 'error' after consecutive failures
 */

// ── AES-GCM Decryption (mirrors functions/lib/credential.ts) ──

const AES_KEY_LENGTH = 256;
const AES_IV_LENGTH = 12;
const AES_GCM_TAG_LENGTH = 128;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAESKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("cloudgame-hub-credential-encryption-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptCredential(
  encryptedValue: string,
  iv: string,
  secret: string
): Promise<string> {
  const key = await getAESKey(secret);
  const ivBytes = base64ToUint8Array(iv);
  const encryptedBytes = base64ToUint8Array(encryptedValue);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes.buffer as ArrayBuffer,
      tagLength: AES_GCM_TAG_LENGTH,
    },
    key,
    encryptedBytes.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function encryptCredential(
  plaintext: string,
  secret: string
): Promise<{ encryptedValue: string; iv: string }> {
  const key = await getAESKey(secret);
  const ivBytes = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes.buffer as ArrayBuffer,
      tagLength: AES_GCM_TAG_LENGTH,
    },
    key,
    new TextEncoder().encode(plaintext).buffer as ArrayBuffer
  );

  return {
    encryptedValue: bufferToBase64(encrypted),
    iv: bufferToBase64(ivBytes.buffer),
  };
}

let _cachedKey: CryptoKey | null = null;
let _cachedSecret = "";

async function getAESKey(secret: string): Promise<CryptoKey> {
  if (_cachedKey && _cachedSecret === secret) {
    return _cachedKey;
  }
  _cachedKey = await deriveAESKey(secret);
  _cachedSecret = secret;
  return _cachedKey;
}

// ── Types ──

interface CredentialRow {
  id: number;
  name: string;
  type: string;
  provider: string;
  endpoint_url: string | null;
  encrypted_value: string;
  encryption_iv: string;
  metadata: string | null;
  status: string;
  auto_renew: number;
  renew_endpoint: string | null;
  expires_at: string | null;
  last_health_check: string | null;
  last_health_status: string | null;
  failure_count: number;
}

interface HealthResult {
  healthy: boolean;
  responseCode: number | null;
  latencyMs: number | null;
  errorMessage: string;
  renewed: boolean;
}

// ── Health Check Logic ──

async function healthCheck(
  credential: CredentialRow,
  secret: string,
  db: D1Database
): Promise<HealthResult> {
  const start = Date.now();
  const type = credential.type;
  const endpoint = credential.endpoint_url || "";
  const expiresAt = credential.expires_at;

  try {
    // Certificate: validate expiry date
    if (type === "certificate") {
      if (expiresAt) {
        const exp = new Date(expiresAt).getTime();
        const now = Date.now();
        if (exp < now) {
          return {
            healthy: false,
            responseCode: null,
            latencyMs: 0,
            errorMessage: "证书已过期",
            renewed: false,
          };
        }
        const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
        return {
          healthy: true,
          responseCode: null,
          latencyMs: 0,
          errorMessage: `证书有效，剩余 ${daysLeft} 天`,
          renewed: false,
        };
      }
      return {
        healthy: true,
        responseCode: null,
        latencyMs: 0,
        errorMessage: "证书无过期日期，假定有效",
        renewed: false,
      };
    }

    // OAuth: check expiry + attempt renewal if expired
    if (type === "oauth") {
      let needsRenewal = false;
      if (expiresAt) {
        const exp = new Date(expiresAt).getTime();
        // Renew if expiring within 1 hour
        if (exp - Date.now() < 3600000) {
          needsRenewal = true;
        }
        if (exp < Date.now()) {
          if (!credential.auto_renew || !credential.renew_endpoint) {
            return {
              healthy: false,
              responseCode: null,
              latencyMs: 0,
              errorMessage: "OAuth Token 已过期，未配置自动续期",
              renewed: false,
            };
          }
          needsRenewal = true;
        }
      }

      // Attempt token renewal
      if (needsRenewal && credential.auto_renew && credential.renew_endpoint) {
        const renewResult = await renewOAuthToken(credential, secret, db);
        if (renewResult.success) {
          return {
            healthy: true,
            responseCode: 200,
            latencyMs: Date.now() - start,
            errorMessage: "OAuth Token 已自动续期",
            renewed: true,
          };
        }
        return {
          healthy: false,
          responseCode: renewResult.code,
          latencyMs: Date.now() - start,
          errorMessage: `续期失败: ${renewResult.error}`,
          renewed: false,
        };
      }

      // Validate token against endpoint if provided
      if (endpoint) {
        const value = await decryptCredential(
          credential.encrypted_value,
          credential.encryption_iv,
          secret
        );
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: value }),
        });
        return {
          healthy: resp.ok,
          responseCode: resp.status,
          latencyMs: Date.now() - start,
          errorMessage: resp.ok ? "OAuth Token 有效" : `HTTP ${resp.status}`,
          renewed: false,
        };
      }

      return {
        healthy: true,
        responseCode: null,
        latencyMs: 0,
        errorMessage: "OAuth Token 未过期",
        renewed: false,
      };
    }

    // api_key / token: make a lightweight request to endpoint
    if (!endpoint) {
      return {
        healthy: false,
        responseCode: null,
        latencyMs: 0,
        errorMessage: "未配置端点地址，无法测试连通性",
        renewed: false,
      };
    }

    const value = await decryptCredential(
      credential.encrypted_value,
      credential.encryption_iv,
      secret
    );

    const headers: Record<string, string> = {
      "User-Agent": "CloudGameHub-Keepalive/1.0",
      "Authorization": `Bearer ${value}`,
    };

    // Build endpoint URL — for xfyun, append /chat/completions and send minimal request
    let testUrl = endpoint;
    let testMethod = "GET";
    let testBody: string | undefined;

    // For MaaS endpoints, use a minimal models list request or lightweight chat
    if (endpoint.includes("/v2") && !endpoint.endsWith("/chat/completions")) {
      // Try models endpoint (lighter than chat)
      testUrl = endpoint.replace(/\/+$/, "") + "/models";
      testMethod = "GET";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let resp: Response;
    try {
      resp = await fetch(testUrl, {
        method: testMethod,
        headers,
        body: testBody,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    // 401/403 = auth failure; 404 = endpoint not found (unhealthy);
    // 5xx = server error (retry); 2xx/3xx = healthy
    const healthy = resp.status >= 200 && resp.status < 400;
    const authValid = resp.status !== 401 && resp.status !== 403;

    return {
      healthy: healthy && authValid,
      responseCode: resp.status,
      latencyMs: Date.now() - start,
      errorMessage: authValid
        ? (resp.status < 400 ? "连接正常" : `HTTP ${resp.status}`)
        : `认证失败 HTTP ${resp.status}`,
      renewed: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      healthy: false,
      responseCode: null,
      latencyMs: Date.now() - start,
      errorMessage: msg.includes("abort") ? "连接超时(10s)" : msg,
      renewed: false,
    };
  }
}

// ── OAuth Token Renewal ──

async function renewOAuthToken(
  credential: CredentialRow,
  secret: string,
  db: D1Database
): Promise<{ success: boolean; code: number | null; error: string }> {
  try {
    const value = await decryptCredential(
      credential.encrypted_value,
      credential.encryption_iv,
      secret
    );

    const resp = await fetch(credential.renew_endpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: value,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { success: false, code: resp.status, error: `HTTP ${resp.status}: ${errText.slice(0, 200)}` };
    }

    const data = await resp.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) {
      return { success: false, code: resp.status, error: "续期响应缺少 access_token" };
    }

    // Re-encrypt the new access_token and persist to D1
    const newTokenValue = data.refresh_token || data.access_token;
    const encrypted = await encryptCredential(newTokenValue, secret);
    const now = new Date().toISOString();

    // Calculate new expiry if expires_in is provided
    let newExpiresAt: string | null = null;
    if (data.expires_in) {
      const expiryDate = new Date(Date.now() + data.expires_in * 1000);
      newExpiresAt = expiryDate.toISOString();
    }

    await db.prepare(
      `UPDATE credentials
       SET encrypted_value = ?,
           encryption_iv = ?,
           expires_at = ?,
           last_health_check = ?,
           last_health_status = 'healthy',
           failure_count = 0,
           updated_at = ?
       WHERE id = ?`
    )
      .bind(
        encrypted.encryptedValue,
        encrypted.iv,
        newExpiresAt,
        now,
        now,
        credential.id
      )
      .run();

    // Insert audit log
    await db.prepare(
      `INSERT INTO credential_health_logs
        (credential_id, check_type, status, response_code, latency_ms, error_message, created_at)
       VALUES (?, 'oauth_renewal', 'healthy', ?, 0, 'Token renewed successfully', ?)`
    )
      .bind(credential.id, resp.status, now)
      .run();

    console.log(
      `[keepalive] ✅ OAuth token renewed and persisted for credential ${credential.id} (${credential.name})`
    );

    return { success: true, code: resp.status, error: "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[keepalive] OAuth renewal failed for credential ${credential.id}:`, msg);
    return { success: false, code: null, error: msg };
  }
}

// ── Retry with Exponential Backoff ──

async function healthCheckWithRetry(
  credential: CredentialRow,
  secret: string,
  db: D1Database,
  maxRetries: number = 2
): Promise<HealthResult> {
  let lastResult: HealthResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await healthCheck(credential, secret, db);

    if (result.healthy) {
      return result;
    }

    lastResult = result;

    // Don't retry on auth failures (401/403) — key is invalid
    if (result.responseCode === 401 || result.responseCode === 403) {
      return result;
    }

    // Don't retry on certificate expiry
    if (credential.type === "certificate" && result.errorMessage.includes("过期")) {
      return result;
    }

    // Retry with exponential backoff: 2s, 4s
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt + 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult!;
}

// ── Main Scheduled Handler ──

// ── Rate limiter for /trigger endpoint (per-isolate) ──
let _triggerHistory: number[] = [];

// ── Core health check logic (shared by scheduled and /trigger) ──

async function runHealthChecks(env: Env): Promise<void> {
  const { DB, ENCRYPTION_MASTER_KEY, JWT_SECRET } = env;
  const encryptionSecret = ENCRYPTION_MASTER_KEY || JWT_SECRET;

  if (!DB || !encryptionSecret) {
    console.error("[keepalive] Missing DB or encryption secret binding");
    return;
  }

  console.log(`[keepalive] Health check started at ${new Date().toISOString()}`);

  // Fetch all credentials that are due for a health check
  const result = await DB.prepare(
    `SELECT id, name, type, provider, endpoint_url, encrypted_value, encryption_iv,
            metadata, status, auto_renew, renew_endpoint, expires_at,
            last_health_check, last_health_status, failure_count
     FROM credentials
     WHERE status IN ('active', 'error')
     ORDER BY last_health_check ASC NULLS FIRST
     LIMIT 50`
  ).all();

  const credentials = result.results as unknown as CredentialRow[];

  if (!credentials || credentials.length === 0) {
    console.log("[keepalive] No credentials to check");
    return;
  }

  console.log(`[keepalive] Checking ${credentials.length} credentials`);

  let healthyCount = 0;
  let unhealthyCount = 0;
  let renewedCount = 0;

  // Process credentials in batches of 5 for concurrency
  const BATCH_SIZE = 5;
  for (let i = 0; i < credentials.length; i += BATCH_SIZE) {
    const batch = credentials.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (credential) => {
        try {
          const healthResult = await healthCheckWithRetry(credential, encryptionSecret, env.DB, 2);

          const now = new Date().toISOString();
          const newStatus = healthResult.healthy ? "active" : "error";
          const newFailureCount = healthResult.healthy
            ? 0
            : (credential.failure_count || 0) + 1;

          // Update credential status
          await DB.prepare(
            `UPDATE credentials
             SET status = ?,
                 last_health_check = ?,
                 last_health_status = ?,
                 failure_count = ?,
                 updated_at = ?
             WHERE id = ?`
          )
            .bind(
              newStatus,
              now,
              healthResult.healthy ? "healthy" : "unhealthy",
              newFailureCount,
              now,
              credential.id
            )
            .run();

          // Insert health log
          await DB.prepare(
            `INSERT INTO credential_health_logs
              (credential_id, check_type, status, response_code, latency_ms, error_message, created_at)
             VALUES (?, 'keepalive_cron', ?, ?, ?, ?, ?)`
          )
            .bind(
              credential.id,
              healthResult.healthy ? "healthy" : "unhealthy",
              healthResult.responseCode,
              healthResult.latencyMs,
              healthResult.errorMessage,
              now
            )
            .run();

          if (healthResult.healthy) {
            healthyCount++;
            console.log(
              `[keepalive] ✅ ${credential.name} (${credential.provider}) — healthy (${healthResult.latencyMs}ms)`
            );
          } else {
            unhealthyCount++;
            console.log(
              `[keepalive] ❌ ${credential.name} (${credential.provider}) — unhealthy: ${healthResult.errorMessage}`
            );

            // Mark as error after 3 consecutive failures
            if (newFailureCount >= 3) {
              console.log(
                `[keepalive] ⚠️ ${credential.name} has ${newFailureCount} consecutive failures — marked as error`
              );
            }
          }

          if (healthResult.renewed) {
            renewedCount++;
          }
        } catch (err) {
          console.error(
            `[keepalive] Error checking credential ${credential.id} (${credential.name}):`,
            err
          );
          unhealthyCount++;
        }
      })
    );
    // Log any unexpected rejections (shouldn't happen since errors are caught above)
    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.error(`[keepalive] Unexpected rejection for ${batch[idx]?.name}:`, r.reason);
        unhealthyCount++;
      }
    });
  }

  // Cleanup old health logs (keep 30 days)
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await DB.prepare(
      "DELETE FROM credential_health_logs WHERE created_at < ?"
    )
      .bind(cutoff)
      .run();
  } catch (cleanupErr) {
    console.error("[keepalive] Health log cleanup failed:", cleanupErr);
  }

  console.log(
    `[keepalive] Summary: ${healthyCount} healthy, ${unhealthyCount} unhealthy, ${renewedCount} renewed (total: ${credentials.length})`
  );
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    await runHealthChecks(env);
  },

  // ── HTTP handler for manual trigger / status check ──
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // GET / — health status of the keepalive worker itself
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "cloudgame-hub-keepalive",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // GET /status — return credential health summary
    if (url.pathname === "/status") {
      if (!env.DB) {
        return new Response(JSON.stringify({ error: "DB not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const summary = await env.DB.prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
           SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
           SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
           SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked
         FROM credentials`
      ).first();

      const recent = await env.DB.prepare(
        `SELECT credential_id, status, response_code, latency_ms, error_message, created_at
         FROM credential_health_logs
         ORDER BY created_at DESC
         LIMIT 20`
      ).all();

      return new Response(
        JSON.stringify({ summary, recentLogs: recent.results }, null, 2),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // POST /trigger — manually trigger a health check (protected by secret token + rate limited)
    if (url.pathname === "/trigger" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      const expectedToken = env.KEEPALIVE_ADMIN_TOKEN;

      if (!expectedToken) {
        return new Response(JSON.stringify({ error: "KEEPALIVE_ADMIN_TOKEN not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (authHeader !== `Bearer ${expectedToken}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Rate limit: max 3 triggers per 5 minutes per isolate
      const now = Date.now();
      _triggerHistory = _triggerHistory.filter((t) => now - t < 5 * 60 * 1000);
      if (_triggerHistory.length >= 3) {
        const oldest = _triggerHistory[0];
        const retryAfter = Math.ceil((5 * 60 * 1000 - (now - oldest)) / 1000);
        return new Response(
          JSON.stringify({ error: "Rate limited", retryAfterSeconds: retryAfter }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(retryAfter),
            },
          }
        );
      }
      _triggerHistory.push(now);

      // Run the same health check logic
      await runHealthChecks(env);

      return new Response(
        JSON.stringify({ status: "triggered", timestamp: new Date().toISOString() }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
