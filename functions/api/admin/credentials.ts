/**
 * POST /api/admin/credentials        — Create a new credential
 * GET  /api/admin/credentials        — List all credentials (masked)
 * GET  /api/admin/credentials/[id]   — Get one credential (masked)
 * PUT  /api/admin/credentials/[id]   — Update a credential
 * DELETE /api/admin/credentials/[id] — Delete a credential
 *
 * All endpoints require `credential:manage` permission.
 * Credential values are encrypted at rest (AES-GCM) and never returned in plaintext.
 */

import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  notFound,
  conflict,
} from "../../lib/response";
import {
  encryptCredential,
  CREDENTIAL_TYPES,
  CREDENTIAL_STATUSES,
  resolveEncryptionSecret,
  setKeyCacheTTL,
  getKeyCacheTTL,
} from "../../lib/credential";
import { logOperation, getClientIP, getUserAgent } from "../../lib/logger";

/** Get the current admin user info from request context. */
function getOperator(context: PageContext): {
  userId: number | null;
  username: string | null;
} {
  const user = context.data?.user;
  if (!user) return { userId: null, username: null };
  return {
    userId: (user.userId as number) ?? null,
    username: (user.username as string) ?? null,
  };
}

/** Validate credential type. */
function isValidType(type: string): boolean {
  return (CREDENTIAL_TYPES as readonly string[]).includes(type);
}

/** Verify the created/updated status is valid. */
function isValidStatus(status: string): boolean {
  return (CREDENTIAL_STATUSES as readonly string[]).includes(status);
}

/** Map D1 row → masked credential DTO. */
function toCredentialDTO(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    name: row.name as string,
    type: row.type as string,
    provider: row.provider as string,
    endpointUrl: (row.endpoint_url as string) || "",
    // Never return encrypted_value / iv — show fixed mask to indicate value is stored
    maskedValue: row.encrypted_value ? "******" : "",
    keyVersion: (row.key_version as number) ?? null,
    metadata: safeParseJSON(row.metadata as string),
    status: row.status as string,
    lastHealthCheck: (row.last_health_check as string) || null,
    lastHealthStatus: (row.last_health_status as string) || "unknown",
    autoRenew: (row.auto_renew as number) === 1,
    expiresAt: (row.expires_at as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function safeParseJSON(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// ── POST: Create credential ──
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "credential:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // V4: Resolve encryption secret (ENCRYPTION_MASTER_KEY or JWT_SECRET fallback)
  let secret: string;
  try {
    secret = resolveEncryptionSecret(context.env);
  } catch (err) {
    return serverError(
      err instanceof Error ? err.message : "加密密钥未配置"
    );
  }

  // V4: Configure cache TTL
  setKeyCacheTTL(getKeyCacheTTL(context.env));

  let body: {
    name?: string;
    type?: string;
    provider?: string;
    endpointUrl?: string;
    value?: string;
    metadata?: Record<string, unknown>;
    status?: string;
    autoRenew?: boolean;
    expiresAt?: string | null;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Validate
  if (!body.name?.trim()) return badRequest("凭证名称不能为空");
  if (!body.type || !isValidType(body.type)) {
    return badRequest(`凭证类型无效，必须是: ${CREDENTIAL_TYPES.join(", ")}`);
  }
  if (!body.value?.trim()) return badRequest("凭证值不能为空");
  if (body.status && !isValidStatus(body.status)) {
    return badRequest(`状态无效，必须是: ${CREDENTIAL_STATUSES.join(", ")}`);
  }

  // Check name uniqueness
  const existing = await DB.prepare(
    "SELECT id FROM credentials WHERE name = ?"
  )
    .bind(body.name.trim())
    .first();
  if (existing) return conflict("凭证名称已存在");

  // Encrypt value — pass DB for D1-backed active key lookup
  let encrypted;
  try {
    encrypted = await encryptCredential(body.value.trim(), secret, DB);
  } catch (err) {
    console.error("[credentials] Encryption failed:", err);
    return serverError("凭证加密失败");
  }

  const now = new Date().toISOString();
  const status = body.status || "active";
  const metadataStr = body.metadata ? JSON.stringify(body.metadata) : "{}";
  const keyVersion = encrypted.keyVersion ?? null;

  try {
    const result = await DB.prepare(
      `INSERT INTO credentials
        (name, type, provider, endpoint_url, encrypted_value, encryption_iv,
         key_version, metadata, status, auto_renew, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.name.trim(),
        body.type,
        body.provider?.trim() || "",
        body.endpointUrl?.trim() || "",
        encrypted.encryptedValue,
        encrypted.iv,
        keyVersion,
        metadataStr,
        status,
        body.autoRenew ? 1 : 0,
        body.expiresAt || null,
        now,
        now
      )
      .run();

    const newId = result.meta?.last_row_id;
    const { userId, username } = getOperator(context);

    await logOperation(DB, {
      userId,
      username,
      action: "create",
      module: "credential",
      target: String(newId),
      ip: getClientIP(context.request),
      detail: {
        name: body.name.trim(),
        type: body.type,
        provider: body.provider || "",
      },
    });

    const created = await DB.prepare(
      "SELECT * FROM credentials WHERE id = ?"
    )
      .bind(newId)
      .first();

    return jsonResponse(toCredentialDTO(created as Record<string, unknown>), "凭证创建成功", 0, 201);
  } catch (err) {
    console.error("[credentials] Create failed:", err);
    return serverError("凭证创建失败");
  }
};

// ── GET: List all credentials (masked, paginated) ──
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "credential:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // Parse pagination params
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const offset = (page - 1) * pageSize;

  try {
    const [result, countResult] = await Promise.all([
      DB.prepare(
        `SELECT * FROM credentials ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
        .bind(pageSize, offset)
        .all(),
      DB.prepare("SELECT COUNT(*) as total FROM credentials").first(),
    ]);

    const list = (result.results || []).map((row) =>
      toCredentialDTO(row as Record<string, unknown>)
    );

    const total = (countResult?.total as number) || 0;

    return jsonResponse({ list, page, pageSize, total });
  } catch (err) {
    console.error("[credentials] List failed:", err);
    return serverError("凭证查询失败");
  }
};
