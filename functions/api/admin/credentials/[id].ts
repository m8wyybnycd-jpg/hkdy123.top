/**
 * GET  /api/admin/credentials/[id]   — Get one credential (masked)
 * PUT  /api/admin/credentials/[id]   — Update a credential
 * DELETE /api/admin/credentials/[id] — Delete a credential
 *
 * All endpoints require `credential:manage` permission.
 * Credential values are encrypted at rest (AES-GCM) and never returned in plaintext.
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  notFound,
  conflict,
} from "../../../lib/response";
import {
  encryptCredential,
  CREDENTIAL_STATUSES,
} from "../../../lib/credential";
import { logOperation, getClientIP } from "../../../lib/logger";

/** Map D1 row → masked credential DTO. */
function toCredentialDTO(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    name: row.name as string,
    type: row.type as string,
    provider: row.provider as string,
    endpointUrl: (row.endpoint_url as string) || "",
    maskedValue: row.encrypted_value ? "******" : "",
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

function isValidStatus(status: string): boolean {
  return (CREDENTIAL_STATUSES as readonly string[]).includes(status);
}

// ── GET: Single credential ──
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "credential:manage");
  if (denied) return denied;

  const { DB } = context.env;
  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return badRequest("无效的凭证 ID");

  try {
    const row = await DB.prepare(
      "SELECT * FROM credentials WHERE id = ?"
    )
      .bind(id)
      .first();

    if (!row) return notFound("凭证不存在");

    return jsonResponse(toCredentialDTO(row as Record<string, unknown>));
  } catch {
    return serverError("凭证查询失败");
  }
};

// ── PUT: Update credential ──
export const onRequestPut = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "credential:manage");
  if (denied) return denied;

  const { DB, JWT_SECRET } = context.env;
  if (!DB) return serverError("数据库不可用");
  if (!JWT_SECRET) return serverError("加密密钥未配置");

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return badRequest("无效的凭证 ID");

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

  // Fetch existing
  const existing = await DB.prepare(
    "SELECT id FROM credentials WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!existing) return notFound("凭证不存在");

  if (body.status && !isValidStatus(body.status)) {
    return badRequest(`状态无效，必须是: ${CREDENTIAL_STATUSES.join(", ")}`);
  }

  // Build update fields
  const updates: string[] = [];
  const binds: unknown[] = [];

  if (body.name !== undefined) {
    if (!body.name.trim()) return badRequest("凭证名称不能为空");
    // Check name uniqueness (exclude current record)
    const dup = await DB.prepare(
      "SELECT id FROM credentials WHERE name = ? AND id != ?"
    )
      .bind(body.name.trim(), id)
      .first();
    if (dup) return conflict("凭证名称已存在");
    updates.push("name = ?");
    binds.push(body.name.trim());
  }
  if (body.type !== undefined) {
    updates.push("type = ?");
    binds.push(body.type);
  }
  if (body.provider !== undefined) {
    updates.push("provider = ?");
    binds.push(body.provider.trim());
  }
  if (body.endpointUrl !== undefined) {
    updates.push("endpoint_url = ?");
    binds.push(body.endpointUrl.trim());
  }
  if (body.value !== undefined) {
    if (!body.value.trim()) return badRequest("凭证值不能为空");
    let encrypted;
    try {
      encrypted = await encryptCredential(body.value.trim(), JWT_SECRET);
    } catch (err) {
      console.error("[credentials] Encryption failed on update:", err);
      return serverError("凭证加密失败");
    }
    updates.push("encrypted_value = ?, encryption_iv = ?");
    binds.push(encrypted.encryptedValue, encrypted.iv);
  }
  if (body.metadata !== undefined) {
    updates.push("metadata = ?");
    binds.push(JSON.stringify(body.metadata));
  }
  if (body.status !== undefined) {
    updates.push("status = ?");
    binds.push(body.status);
  }
  if (body.autoRenew !== undefined) {
    updates.push("auto_renew = ?");
    binds.push(body.autoRenew ? 1 : 0);
  }
  if (body.expiresAt !== undefined) {
    updates.push("expires_at = ?");
    binds.push(body.expiresAt || null);
  }

  if (updates.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(id);

  try {
    await DB.prepare(
      `UPDATE credentials SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...binds)
      .run();

    const { userId, username } = {
      userId: context.data?.user?.userId as number,
      username: context.data?.user?.username as string,
    };

    await logOperation(DB, {
      userId,
      username,
      action: "update",
      module: "credential",
      target: String(id),
      ip: getClientIP(context.request),
      detail: { updatedFields: Object.keys(body) },
    });

    const updated = await DB.prepare(
      "SELECT * FROM credentials WHERE id = ?"
    )
      .bind(id)
      .first();

    return jsonResponse(toCredentialDTO(updated as Record<string, unknown>), "凭证更新成功");
  } catch (err) {
    console.error("[credentials] Update failed:", err);
    return serverError("凭证更新失败");
  }
};

// ── DELETE: Remove credential ──
export const onRequestDelete = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "credential:manage");
  if (denied) return denied;

  const { DB } = context.env;
  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return badRequest("无效的凭证 ID");

  try {
    const existing = await DB.prepare(
      "SELECT name FROM credentials WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!existing) return notFound("凭证不存在");

    await DB.prepare("DELETE FROM credentials WHERE id = ?")
      .bind(id)
      .run();

    const { userId, username } = {
      userId: context.data?.user?.userId as number,
      username: context.data?.user?.username as string,
    };

    await logOperation(DB, {
      userId,
      username,
      action: "delete",
      module: "credential",
      target: String(id),
      ip: getClientIP(context.request),
      detail: { name: (existing.name as string) || "" },
    });

    return jsonResponse(null, "凭证已删除");
  } catch {
    return serverError("凭证删除失败");
  }
};
