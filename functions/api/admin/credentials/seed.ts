/**
 * TEMPORARY MIGRATION ENDPOINT — seed xfyun API key into D1.
 *
 * One-time use only. Protected by a migration token in the query string.
 * Encrypts XFMAAS_API_KEY with JWT_SECRET (server-side) and inserts into D1.
 * Idempotent: skips if an "xfyun" credential already exists.
 *
 * DELETE THIS FILE AFTER MIGRATION.
 */

import { jsonResponse, serverError } from "../../../lib/response";
import {
  encryptCredential,
  getCredentialMetaByProvider,
  getCredentialByProvider,
} from "../../../lib/credential";

const MIGRATION_TOKEN = "cgm-migrate-2026-07-15-xfyun";

export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const { DB, JWT_SECRET, XFMAAS_API_KEY } = context.env;

  const token = new URL(context.request.url).searchParams.get("token");
  if (token !== MIGRATION_TOKEN) {
    return jsonResponse(null, "forbidden", 403);
  }

  if (!DB || !JWT_SECRET) return serverError("数据库或加密密钥未配置");
  if (!XFMAAS_API_KEY) return serverError("XFMAAS_API_KEY 未配置");

  // Idempotent: skip if xfyun already exists
  const existing = await getCredentialMetaByProvider(DB, "xfyun");
  if (existing) {
    // Verify decryption works (proves column-name fix is live)
    const roundtrip = await getCredentialByProvider(DB, JWT_SECRET, "xfyun", "");
    return jsonResponse(
      {
        skipped: true,
        id: existing.id,
        roundtripMatch: roundtrip === XFMAAS_API_KEY,
        decryptedLength: roundtrip.length,
      },
      "xfyun 凭证已存在，跳过迁移"
    );
  }

  const { encryptedValue, iv } = await encryptCredential(
    XFMAAS_API_KEY,
    JWT_SECRET
  );

  const now = new Date().toISOString();
  const result = await DB.prepare(
    `INSERT INTO credentials
      (name, type, provider, endpoint_url, encrypted_value, encryption_iv,
       metadata, status, auto_renew, created_at, updated_at)
     VALUES (?, 'api_key', 'xfyun', ?, ?, ?, ?, 'active', 0, ?, ?)`
  )
    .bind(
      "讯飞MaaS 混元7B",
      "https://maas-api.cn-huabei-1.xf-yun.com/v2",
      encryptedValue,
      iv,
      JSON.stringify({ model_id: "xophunyuan7bmt" }),
      now,
      now
    )
    .run();

  // Round-trip verify: decrypt what we just stored
  const roundtrip = await getCredentialByProvider(DB, JWT_SECRET, "xfyun", "");

  return jsonResponse(
    {
      inserted: true,
      id: result.meta?.last_row_id ?? null,
      roundtripMatch: roundtrip === XFMAAS_API_KEY,
      envLength: XFMAAS_API_KEY.length,
      decryptedLength: roundtrip.length,
    },
    "xfyun 凭证已成功迁移至 D1"
  );
};
