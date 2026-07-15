/**
 * PUT /api/admin/encryption/keys/[id] — Update key status (deprecate/revoke)
 *
 * Requires `encryption:manage` permission.
 *
 * Supports:
 *   { status: "revoked" }    — Revoke a key, preventing future decryption with it
 *   { status: "deprecated" } — Mark key as deprecated (still usable, warning logged)
 *
 * Active keys cannot be revoked directly; deactivate them first by creating
 * a new key version (POST /api/admin/encryption/keys), then revoke the old one.
 *
 * Revoked keys cannot be un-revoked.
 */

import { requirePermission } from "../../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../../../lib/response";
import { logOperation, getClientIP } from "../../../../lib/logger";
import {
  invalidateKeyCache,
  KEY_STATUSES,
} from "../../../../lib/credential";

/** Map encryption_keys D1 row → camelCase DTO. */
function mapKeyRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    keyVersion: row.key_version as number,
    keyHash: row.key_hash as string,
    algorithm: (row.algorithm as string) ?? "AES-256-GCM",
    isActive: (row.is_active as number) === 1,
    status: (row.status as string) || "active",
    hasKeyMaterial: !!(row.encrypted_key as string),
    hasIV: !!(row.iv as string),
    createdAt: row.created_at as string,
    rotatedAt: (row.rotated_at as string) ?? null,
  };
}

export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "encryption:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return badRequest("无效的密钥 ID");

  let body: { status?: string };
  try {
    body = (await context.request.json()) as { status?: string };
  } catch {
    return badRequest("无效的请求体");
  }

  if (!body.status) {
    return badRequest("缺少 status 字段");
  }

  if (!(KEY_STATUSES as readonly string[]).includes(body.status)) {
    return badRequest(
      `无效的状态值: ${body.status}，必须是: ${KEY_STATUSES.join(", ")}`
    );
  }

  try {
    const existing = await DB.prepare(
      "SELECT * FROM encryption_keys WHERE id = ?"
    )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!existing) {
      return badRequest("密钥不存在");
    }

    const currentStatus = existing.status as string;
    const isActive = (existing.is_active as number) === 1;
    const keyVersion = existing.key_version as number;

    // Prevent revoking active keys
    if (body.status === "revoked" && isActive) {
      return badRequest(
        "不能直接吊销活跃密钥。请先创建新密钥版本（会自动弃用当前密钥），再吊销旧版本。"
      );
    }

    // Prevent un-revoking
    if (currentStatus === "revoked") {
      return badRequest("已吊销的密钥不能更改状态");
    }

    // Prevent re-activating deprecated keys (create a new key instead)
    if (body.status === "active" && !isActive) {
      return badRequest(
        "不能将已弃用的密钥重新激活。请创建新的密钥版本。"
      );
    }

    const now = new Date().toISOString();

    await DB.prepare(
      "UPDATE encryption_keys SET status = ?, rotated_at = ? WHERE id = ?"
    )
      .bind(body.status, now, id)
      .run();

    // Invalidate cache so revoked keys are immediately rejected
    invalidateKeyCache();

    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: body.status === "revoked" ? "revoke" : "update_status",
      module: "encryption_key",
      target: `v${keyVersion}`,
      ip: getClientIP(context.request),
      detail: {
        action: body.status === "revoked" ? "key_revoked" : "status_change",
        keyVersion,
        oldStatus: currentStatus,
        newStatus: body.status,
      },
    });

    console.log(
      JSON.stringify({
        level: "info",
        message: `encryption_key_${body.status}`,
        keyVersion,
        oldStatus: currentStatus,
        operatorId,
        timestamp: now,
      })
    );

    const updated = await DB.prepare(
      "SELECT * FROM encryption_keys WHERE id = ?"
    )
      .bind(id)
      .first<Record<string, unknown>>();

    return jsonResponse(
      mapKeyRow(updated as Record<string, unknown>),
      "密钥状态更新成功"
    );
  } catch (err) {
    console.error("[encryption_keys] 状态更新失败:", err);
    return serverError("密钥状态更新失败");
  }
};
