/**
 * POST /api/admin/credentials/[id]/test — Test/health-check a credential connection.
 *
 * Requires `credential:manage` permission.
 * Performs a lightweight connectivity/auth test against the credential's endpoint:
 *   - api_key:   Sends a HEAD/GET request with Bearer auth, checks 2xx/3xx
 *   - token:     Sends a GET request with Bearer token, checks 2xx/3xx
 *   - oauth:     Validates token is not expired; optionally calls tokeninfo endpoint
 *   - certificate: Validates cert expiry date against `expires_at`
 *
 * Records results in credential_health_logs and updates credential status.
 * This is the core of the keepalive mechanism — triggers a health check
 * on-demand (also called by a scheduled keepalive cron).
 */

import { requirePermission } from "../../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  notFound,
} from "../../../../lib/response";
import {
  decryptCredential,
  CREDENTIAL_TYPE_LABELS,
} from "../../../../lib/credential";
import { logOperation, getClientIP } from "../../../../lib/logger";

/** Perform a health check for a credential. */
async function healthCheck(
  db: D1Database,
  secret: string,
  credential: Record<string, unknown>
): Promise<{
  healthy: boolean;
  responseCode: number | null;
  latencyMs: number | null;
  errorMessage: string;
}> {
  const start = Date.now();
  const type = credential.type as string;
  const endpoint = (credential.endpoint_url as string) || "";
  const expiresAt = (credential.expires_at as string) || null;

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
          };
        }
        const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));
        return {
          healthy: true,
          responseCode: null,
          latencyMs: 0,
          errorMessage: `证书有效，剩余 ${daysLeft} 天`,
        };
      }
      return {
        healthy: true,
        responseCode: null,
        latencyMs: 0,
        errorMessage: "证书无过期日期，假定有效",
      };
    }

    // OAuth: check token not expired
    if (type === "oauth") {
      if (expiresAt) {
        const exp = new Date(expiresAt).getTime();
        if (exp < Date.now()) {
          return {
            healthy: false,
            responseCode: null,
            latencyMs: 0,
            errorMessage: "OAuth Token 已过期，需重新授权",
          };
        }
      }
      // If endpoint is provided, validate token
      if (endpoint) {
        const value = await decryptCredential(
          credential.encrypted_value as string,
          credential.iv as string,
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
        };
      }
      return {
        healthy: true,
        responseCode: null,
        latencyMs: 0,
        errorMessage: "OAuth Token 未过期",
      };
    }

    // api_key / token: make a request to endpoint with auth
    if (!endpoint) {
      return {
        healthy: false,
        responseCode: null,
        latencyMs: 0,
        errorMessage: "未配置端点地址，无法测试连通性",
      };
    }

    const value = await decryptCredential(
      credential.encrypted_value as string,
      credential.iv as string,
      secret
    );

    const headers: Record<string, string> = {
      "User-Agent": "CloudGameHub-CredentialHealthCheck/1.0",
    };
    if (type === "api_key") {
      headers["Authorization"] = `Bearer ${value}`;
    } else if (type === "token") {
      headers["Authorization"] = `Bearer ${value}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let resp: Response;
    try {
      resp = await fetch(endpoint, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const healthy = resp.status >= 200 && resp.status < 400;
    return {
      healthy,
      responseCode: resp.status,
      latencyMs: Date.now() - start,
      errorMessage: healthy ? "连接正常" : `HTTP ${resp.status}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      healthy: false,
      responseCode: null,
      latencyMs: Date.now() - start,
      errorMessage: msg.includes("abort") ? "连接超时(8s)" : msg,
    };
  }
}

// ── POST: Test credential ──
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "credential:manage");
  if (denied) return denied;

  const { DB, JWT_SECRET } = context.env;
  if (!DB) return serverError("数据库不可用");
  if (!JWT_SECRET) return serverError("加密密钥未配置");

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return badRequest("无效的凭证 ID");

  try {
    const credential = await DB.prepare(
      "SELECT * FROM credentials WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!credential) return notFound("凭证不存在");

    // Run health check
    const result = await healthCheck(DB, JWT_SECRET, credential as Record<string, unknown>);

    const now = new Date().toISOString();
    const newStatus = result.healthy ? "active" : "error";

    // Update credential status + health timestamp
    await DB.prepare(
      `UPDATE credentials
       SET status = ?, last_health_check = ?, last_health_status = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        newStatus,
        now,
        result.healthy ? "healthy" : "unhealthy",
        now,
        id
      )
      .run();

    // Insert health log
    await DB.prepare(
      `INSERT INTO credential_health_logs
        (credential_id, check_type, status, response_code, latency_ms, error_message, created_at)
       VALUES (?, 'auth_test', ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        result.healthy ? "healthy" : "unhealthy",
        result.responseCode,
        result.latencyMs,
        result.errorMessage,
        now
      )
      .run();

    const { userId, username } = {
      userId: context.data?.user?.userId as number,
      username: context.data?.user?.username as string,
    };

    await logOperation(DB, {
      userId,
      username,
      action: "test",
      module: "credential",
      target: String(id),
      ip: getClientIP(context.request),
      detail: {
        type: credential.type,
        healthy: result.healthy,
        responseCode: result.responseCode,
        latencyMs: result.latencyMs,
      },
    });

    return jsonResponse({
      healthy: result.healthy,
      responseCode: result.responseCode,
      latencyMs: result.latencyMs,
      message: result.errorMessage,
      status: newStatus,
      type: CREDENTIAL_TYPE_LABELS[(credential.type as keyof typeof CREDENTIAL_TYPE_LABELS)] || credential.type,
    }, result.healthy ? "凭证连接正常" : "凭证连接异常");
  } catch {
    return serverError("凭证测试失败");
  }
};
