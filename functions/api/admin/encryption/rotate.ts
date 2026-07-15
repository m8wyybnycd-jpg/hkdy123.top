/**
 * POST /api/admin/encryption/rotate
 *
 * Perform a full key rotation: re-encrypt all existing credentials
 * with the current active key version.
 *
 * Requires `encryption:manage` permission.
 *
 * Process:
 * 1. Verify there is an active key version with key material
 * 2. Read ALL credentials from the database
 * 3. Decrypt each credential with its current key (versioned or legacy)
 * 4. Re-encrypt with the active key
 * 5. Update credential records with new encrypted values + key version
 * 6. Record detailed audit trail with per-credential results
 *
 * Body: (optional) { dryRun?: boolean } — if true, only reports count without re-encrypting
 *
 * V4: Uses resolveEncryptionSecret for independent master key support.
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";
import {
  reEncryptCredential,
  decryptCredential,
  resolveEncryptionSecret,
  setKeyCacheTTL,
  getKeyCacheTTL,
} from "../../../lib/credential";

export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "encryption:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // V4: Resolve encryption secret with independent key support
  let secret: string;
  try {
    secret = resolveEncryptionSecret(context.env);
  } catch (err) {
    return serverError(
      err instanceof Error ? err.message : "加密密钥未配置"
    );
  }

  // V4: Configure key cache TTL
  const ttlMs = getKeyCacheTTL(context.env);
  setKeyCacheTTL(ttlMs);

  let body: { dryRun?: boolean };
  try {
    body = (await context.request.json()) as { dryRun?: boolean };
  } catch {
    body = {};
  }

  const dryRun = body.dryRun === true;

  try {
    // 1. Get the active key version (must have key material)
    const activeKey = await DB.prepare(
      "SELECT * FROM encryption_keys WHERE is_active = 1 AND status = 'active' ORDER BY key_version DESC LIMIT 1"
    ).first<Record<string, unknown>>();

    if (!activeKey) {
      return badRequest("没有活跃的加密密钥版本，请先创建密钥（POST /api/admin/encryption/keys）");
    }

    if (!activeKey.encrypted_key || !activeKey.iv) {
      return badRequest(
        `活跃密钥版本 v${activeKey.key_version} 缺少密钥材料（encrypted_key/iv）。请重新创建密钥。`
      );
    }

    const activeVersion = activeKey.key_version as number;

    // 2. Get all credentials that need re-encryption
    //    Select id, name, and the current encryption state
    const credentials = await DB.prepare(
      `SELECT id, name, type, provider, encrypted_value, encryption_iv, key_version
       FROM credentials`
    ).all<Record<string, unknown>>();

    const credentialList = credentials.results || [];
    const totalCount = credentialList.length;

    if (totalCount === 0) {
      return jsonResponse(
        { totalCredentials: 0, reEncrypted: 0, failed: 0, activeKeyVersion: activeVersion },
        "没有需要重新加密的凭证"
      );
    }

    // Build summary: how many are already on the active version
    const alreadyCurrent = credentialList.filter(
      (c) => (c.key_version as number) === activeVersion
    ).length;
    const needsRotation = totalCount - alreadyCurrent;

    if (dryRun) {
      return jsonResponse({
        dryRun: true,
        totalCredentials: totalCount,
        alreadyOnActiveVersion: alreadyCurrent,
        needsRotation,
        activeKeyVersion: activeVersion,
        message: `预检完成：共 ${totalCount} 个凭证，${alreadyCurrent} 个已使用当前密钥版本，${needsRotation} 个需要重新加密`,
      });
    }

    // 3. Re-encrypt credentials that aren't on the active version
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const failedIds: number[] = [];
    const skippedIds: number[] = [];
    const now = new Date().toISOString();

    for (const cred of credentialList) {
      try {
        const id = cred.id as number;
        const encryptedValue = cred.encrypted_value as string;
        const iv = cred.encryption_iv as string;
        const currentKeyVersion = (cred.key_version as number) ?? null;

        // Skip credentials already on the active version
        if (currentKeyVersion === activeVersion) {
          skipCount++;
          skippedIds.push(id);
          continue;
        }

        if (!encryptedValue || !iv) {
          failCount++;
          failedIds.push(id);
          console.warn(`[encryption_rotate] 凭证 ${id} (${cred.name}) 缺少加密数据，已跳过`);
          continue;
        }

        // Decrypt with the old key and re-encrypt with the active key
        const reEncrypted = await reEncryptCredential(
          encryptedValue, iv, secret, DB, currentKeyVersion
        );

        // Update the credential
        await DB.prepare(
          `UPDATE credentials
           SET encrypted_value = ?, encryption_iv = ?, key_version = ?, updated_at = ?
           WHERE id = ?`
        )
          .bind(reEncrypted.encryptedValue, reEncrypted.iv, reEncrypted.keyVersion, now, id)
          .run();

        successCount++;
      } catch (err) {
        failCount++;
        failedIds.push(cred.id as number);
        console.error(
          `[encryption_rotate] 重新加密凭证 ${cred.id} (${cred.name}) 失败:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // 4. Record the rotation in the encryption_keys table
    await DB.prepare(
      "UPDATE encryption_keys SET rotated_at = ? WHERE key_version = ?"
    )
      .bind(now, activeVersion)
      .run();

    // 5. Audit log
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "re_encrypt_all",
      module: "encryption_key",
      target: `v${activeVersion}`,
      ip: getClientIP(context.request),
      detail: {
        action: "full_re_encryption",
        activeKeyVersion: activeVersion,
        totalCredentials: totalCount,
        previouslyCurrent: skipCount,
        successCount,
        failCount,
        failedIds: failedIds.length > 0 ? failedIds : undefined,
        skippedIds: skippedIds.length > 0 ? skippedIds.slice(0, 20) : undefined, // limit detail
      },
    });

    console.log(
      JSON.stringify({
        level: "info",
        message: "encryption_full_rotation_complete",
        activeKeyVersion: activeVersion,
        totalCredentials: totalCount,
        previouslyCurrent: skipCount,
        successCount,
        failCount,
        operatorId,
        timestamp: now,
      })
    );

    if (failCount > 0) {
      return jsonResponse(
        {
          totalCredentials: totalCount,
          alreadyOnActiveVersion: skipCount,
          reEncrypted: successCount,
          failed: failCount,
          failedIds: failedIds.slice(0, 20),
          activeKeyVersion: activeVersion,
          partial: true,
        },
        `部分完成：${successCount} 个成功，${skipCount} 个跳过（已是当前版本），${failCount} 个失败`,
        0,
        failCount === totalCount ? 500 : 200
      );
    }

    return jsonResponse(
      {
        totalCredentials: totalCount,
        alreadyOnActiveVersion: skipCount,
        reEncrypted: successCount,
        failed: 0,
        activeKeyVersion: activeVersion,
      },
      `${successCount} 个凭证已重新加密（${skipCount} 个已是当前版本）`
    );
  } catch (err) {
    console.error("[encryption_rotate] 轮换操作失败:", err);
    return serverError("密钥轮换操作失败");
  }
};
