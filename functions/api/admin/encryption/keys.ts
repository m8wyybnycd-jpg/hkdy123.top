/**
 * GET  /api/admin/encryption/keys       — List all encryption key versions
 * POST /api/admin/encryption/keys       — Create a new key version
 * PUT  /api/admin/encryption/keys/[id]  — Update key status (deprecate/revoke)
 *
 * All require `encryption:manage` permission.
 *
 * Security model:
 * - Each key version gets a truly random 256-bit AES key (crypto.getRandomValues)
 * - Raw key material is NEVER stored — only SHA-256 hash for verification
 * - The raw key is encrypted ("wrapped") with a master key derived from
 *   ENCRYPTION_MASTER_KEY (or JWT_SECRET as fallback)
 * - The wrapped key is stored in `encryption_keys.encrypted_key`
 * - Only one key version is active at a time
 * - Creating a new version sets it as active and deprecates all others
 * - Keys can be explicitly revoked (prevents all future decryption with that key)
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";
import {
  generateRawAESKey,
  wrapVersionKey,
  deriveMasterKey,
  invalidateKeyCache,
  setKeyCacheTTL,
  getKeyCacheTTL,
  resolveEncryptionSecret,
  KEY_STATUSES,
} from "../../../lib/credential";

/** Map encryption_keys D1 row → camelCase DTO (never returns encrypted_key). */
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

/**
 * GET /api/admin/encryption/keys — 列出所有密钥版本
 *
 * Only hashes and metadata are returned — key material is never exposed.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "encryption:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      "SELECT * FROM encryption_keys ORDER BY key_version DESC"
    ).all<Record<string, unknown>>();

    const list = (result.results || []).map(mapKeyRow);

    return jsonResponse({ list, total: list.length });
  } catch (err) {
    console.error("[encryption_keys] 查询失败:", err);
    return serverError("密钥查询失败");
  }
};

/**
 * Compute SHA-256 hash of raw bytes and return hex string.
 */
async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * POST /api/admin/encryption/keys — 创建新密钥版本
 *
 * Generates a new random 256-bit AES key, wraps it with the master key
 * (derived from ENCRYPTION_MASTER_KEY or JWT_SECRET fallback), and stores
 * the wrapped key + hash. All previous active keys are deprecated.
 *
 * Body: (optional) { algorithm?: string }
 */
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

  // V4: Configure key cache TTL from environment
  const ttlMs = getKeyCacheTTL(context.env);
  setKeyCacheTTL(ttlMs);

  let body: { algorithm?: string };
  try {
    body = (await context.request.json()) as { algorithm?: string };
  } catch {
    body = {};
  }

  const algorithm = body.algorithm || "AES-256-GCM";
  const validAlgorithms = ["AES-256-GCM"];
  if (!validAlgorithms.includes(algorithm)) {
    return badRequest(`不支持的加密算法: ${algorithm}，支持: ${validAlgorithms.join(", ")}`);
  }

  try {
    // 1. Find the current max key version
    const maxVersionRow = await DB.prepare(
      "SELECT MAX(key_version) as max_version FROM encryption_keys"
    ).first<{ max_version: number | null }>();

    const nextVersion = (maxVersionRow?.max_version ?? 0) + 1;

    // 2. Generate a truly random 256-bit (32-byte) AES key
    const rawKey = generateRawAESKey();

    // 3. Compute SHA-256 hash of the raw key for verification (NOT for encryption)
    const keyHash = await sha256Hex(rawKey);

    // 4. Derive master key from the resolved secret
    const masterKey = await deriveMasterKey(secret);

    // 5. Wrap (encrypt) the raw version key with the master key
    const { encryptedKey, iv } = await wrapVersionKey(rawKey, masterKey);

    const now = new Date().toISOString();

    // 6. Batch: deactivate all existing active keys (set to deprecated) + insert new active key
    const deactivateStmt = DB.prepare(
      "UPDATE encryption_keys SET is_active = 0, status = 'deprecated', rotated_at = ? WHERE is_active = 1"
    ).bind(now);

    const insertStmt = DB.prepare(
      `INSERT INTO encryption_keys (key_version, key_hash, encrypted_key, iv, algorithm, is_active, status, created_at)
       VALUES (?, ?, ?, ?, ?, 1, 'active', ?)`
    ).bind(nextVersion, keyHash, encryptedKey, iv, algorithm, now);

    await DB.batch([deactivateStmt, insertStmt]);

    // 7. Invalidate key cache so next encrypt uses the new key immediately
    invalidateKeyCache();

    // Audit log
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "create",
      module: "encryption_key",
      target: `v${nextVersion}`,
      ip: getClientIP(context.request),
      detail: {
        action: "key_creation",
        newVersion: nextVersion,
        algorithm,
        previousVersionsDeprecated: true,
        keyHash: keyHash.substring(0, 8) + "...", // Log truncated hash only
      },
    });

    console.log(
      JSON.stringify({
        level: "info",
        message: "encryption_key_created",
        newVersion: nextVersion,
        algorithm,
        operatorId,
        timestamp: now,
      })
    );

    // Fetch the newly created key
    const newKey = await DB.prepare(
      "SELECT * FROM encryption_keys WHERE key_version = ?"
    )
      .bind(nextVersion)
      .first<Record<string, unknown>>();

    return jsonResponse(mapKeyRow(newKey as Record<string, unknown>), "密钥创建成功", 0, 201);
  } catch (err) {
    console.error("[encryption_keys] 创建失败:", err);
    return serverError("密钥创建失败");
  }
};

