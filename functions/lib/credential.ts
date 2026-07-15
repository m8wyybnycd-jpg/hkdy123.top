/**
 * Credential encryption & management utilities.
 *
 * Uses Web Crypto API exclusively — zero external dependencies.
 * AES-GCM 256-bit encryption for credential values at rest.
 * Each credential gets a unique random IV per encryption operation.
 *
 * V4: Independent encryption master key support.
 *   - ENCRYPTION_MASTER_KEY env var takes priority over JWT_SECRET for the
 *     master key derivation. This decouples credential encryption from the
 *     JWT signing secret, so rotating JWT_SECRET does not invalidate
 *     encrypted credentials.
 *   - Configurable key cache TTL via KEY_CACHE_TTL_SECONDS.
 *   - Decryption audit logging to credential_decrypt_logs table.
 *   - Key lifecycle status (active / deprecated / revoked).
 *
 * V3: Multi-version keying — credentials can be encrypted with independent
 * per-version AES keys stored in the `encryption_keys` table. Each key
 * version's raw key material is encrypted by a master key derived from
 * PBKDF2. This enables safe key rotation without re-encrypting
 * every credential at once — old credentials can still be decrypted with
 * their stored `key_version`.
 *
 * Backward compatible: credentials without `key_version` fall back to the
 * legacy JWT_SECRET-as-key approach.
 *
 * Fully compatible with Cloudflare Workers / Pages Functions.
 */

// ── AES-GCM Constants ────────────────────────────────────

const AES_KEY_LENGTH = 256; // bits
const AES_IV_LENGTH = 12; // bytes (96-bit IV is recommended for GCM)
const AES_GCM_TAG_LENGTH = 128; // bits

/** PBKDF2 salt for master key derivation. */
const MASTER_KEY_SALT = "cloudgame-hub-credential-encryption-v1";

/** PBKDF2 iterations for key derivation. */
const PBKDF2_ITERATIONS = 100000;

/** Default key cache TTL in seconds (5 minutes). */
const DEFAULT_KEY_CACHE_TTL_SECONDS = 300;

// ── Base64 Helpers ───────────────────────────────────────

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Secret Resolution ────────────────────────────────────

/**
 * Resolve the master encryption secret from environment bindings.
 *
 * Priority:
 *   1. ENCRYPTION_MASTER_KEY — dedicated independent key (V4)
 *   2. JWT_SECRET — legacy fallback for backward compatibility
 *
 * Using a dedicated ENCRYPTION_MASTER_KEY decouples credential encryption
 * from JWT signing. This means rotating JWT_SECRET does NOT invalidate
 * all encrypted credentials.
 *
 * The secret must be at least 16 characters for adequate PBKDF2 entropy.
 *
 * @param env - Environment bindings (typically context.env)
 * @returns The resolved secret string
 * @throws if neither ENCRYPTION_MASTER_KEY nor JWT_SECRET is configured
 */
export function resolveEncryptionSecret(env: {
  ENCRYPTION_MASTER_KEY?: string;
  JWT_SECRET?: string;
}): string {
  const masterKey = env.ENCRYPTION_MASTER_KEY?.trim();
  if (masterKey && masterKey.length >= 16) {
    return masterKey;
  }
  if (masterKey && masterKey.length < 16) {
    console.warn(
      "[credential] ENCRYPTION_MASTER_KEY is too short (<16 chars), falling back to JWT_SECRET"
    );
  }
  const jwtSecret = env.JWT_SECRET?.trim();
  if (jwtSecret && jwtSecret.length >= 16) {
    if (!masterKey) {
      console.warn(
        "[credential] ENCRYPTION_MASTER_KEY not set. Using JWT_SECRET as master key. " +
        "Consider setting ENCRYPTION_MASTER_KEY to decouple credential encryption from JWT signing."
      );
    }
    return jwtSecret;
  }
  throw new Error(
    "Neither ENCRYPTION_MASTER_KEY nor JWT_SECRET is configured. " +
    "Credential encryption requires at least one of these environment variables (min 16 chars)."
  );
}

/**
 * Resolve key cache TTL from environment or return the default (300s).
 *
 * @param env - Environment bindings with optional KEY_CACHE_TTL_SECONDS
 * @returns TTL in milliseconds
 */
export function getKeyCacheTTL(env?: {
  KEY_CACHE_TTL_SECONDS?: string;
}): number {
  if (env?.KEY_CACHE_TTL_SECONDS) {
    const seconds = parseInt(env.KEY_CACHE_TTL_SECONDS, 10);
    if (!isNaN(seconds) && seconds >= 10 && seconds <= 86400) {
      return seconds * 1000;
    }
    console.warn(
      `[credential] Invalid KEY_CACHE_TTL_SECONDS "${env.KEY_CACHE_TTL_SECONDS}", using default ${DEFAULT_KEY_CACHE_TTL_SECONDS}s`
    );
  }
  return DEFAULT_KEY_CACHE_TTL_SECONDS * 1000;
}

// ── Master Key Derivation ────────────────────────────────

/**
 * Derive the master AES-GCM CryptoKey from a secret using PBKDF2.
 *
 * This master key is used to encrypt/decrypt version-specific keys stored
 * in the `encryption_keys.encrypted_key` column. It is also used as the
 * fallback encryption key for legacy credentials (no key_version).
 *
 * @param secret - The resolved encryption secret (from resolveEncryptionSecret)
 * @returns A non-extractable AES-GCM CryptoKey
 */
export async function deriveMasterKey(secret: string): Promise<CryptoKey> {
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
      salt: new TextEncoder().encode(MASTER_KEY_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// ── Key Cache (with configurable TTL) ────────────────────

interface CacheEntry {
  key: CryptoKey;
  version: number; // key_version
  expiresAt: number; // epoch ms
}

/** Cached master key. */
let _cachedMasterKey: CryptoKey | null = null;
let _cachedMasterSecret = "";

/** Cached version-specific keys. Map<keyVersion, CacheEntry>. */
const _versionKeyCache = new Map<number, CacheEntry>();

/** Active TTL value (updated when getKeyCacheTTL is called). */
let _activeCacheTTLMs = DEFAULT_KEY_CACHE_TTL_SECONDS * 1000;

/**
 * Get or derive the cached master key.
 */
async function getMasterKey(secret: string): Promise<CryptoKey> {
  if (_cachedMasterKey && _cachedMasterSecret === secret) {
    return _cachedMasterKey;
  }
  _cachedMasterKey = await deriveMasterKey(secret);
  _cachedMasterSecret = secret;
  return _cachedMasterKey;
}

/** Purge all cached keys (master + version-specific). */
function purgeKeyCache(): void {
  _cachedMasterKey = null;
  _cachedMasterSecret = "";
  _versionKeyCache.clear();
}

// ── Encryption Key Management (D1-backed) ────────────────

/** Key lifecycle statuses. */
export const KEY_STATUSES = ["active", "deprecated", "revoked"] as const;
export type KeyStatus = (typeof KEY_STATUSES)[number];

/**
 * Encrypt a raw AES key with the master key for storage in encryption_keys.
 *
 * @param rawKey    - 32 raw bytes of the AES-256 key
 * @param masterKey - Master AES-GCM key derived from the encryption secret
 * @returns Base64 `encryptedKey` and `iv` for storage
 */
export async function wrapVersionKey(
  rawKey: Uint8Array,
  masterKey: CryptoKey
): Promise<{ encryptedKey: string; iv: string }> {
  const ivBytes = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer, tagLength: AES_GCM_TAG_LENGTH },
    masterKey,
    rawKey.buffer as ArrayBuffer
  );

  return {
    encryptedKey: bufferToBase64(encrypted),
    iv: bufferToBase64(ivBytes.buffer),
  };
}

/**
 * Decrypt a version-specific key from the `encrypted_key` column.
 *
 * @param encryptedKey - Base64-encoded wrapped key
 * @param iv           - Base64-encoded IV used during wrapping
 * @param masterKey    - Master AES-GCM key derived from the encryption secret
 * @returns The raw 32-byte AES-256 key
 * @throws if decryption fails
 */
export async function unwrapVersionKey(
  encryptedKey: string,
  iv: string,
  masterKey: CryptoKey
): Promise<Uint8Array> {
  const ivBytes = base64ToUint8Array(iv);
  const encryptedBytes = base64ToUint8Array(encryptedKey);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer, tagLength: AES_GCM_TAG_LENGTH },
    masterKey,
    encryptedBytes.buffer as ArrayBuffer
  );

  return new Uint8Array(decrypted);
}

/**
 * Import raw 32-byte key material as an AES-GCM CryptoKey.
 */
async function importRawAESKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKey.buffer as ArrayBuffer,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a new random 256-bit (32-byte) AES key.
 */
export function generateRawAESKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Get or derive a cached version-specific CryptoKey.
 *
 * Fetches from cache if available and not expired; otherwise queries D1,
 * unwraps the version key, and caches it.
 *
 * V4: Checks key status — refuses to use `revoked` keys.
 *     Respects configurable cache TTL.
 *
 * @param db      - D1 database binding
 * @param secret  - The resolved encryption secret
 * @param version - Key version to retrieve
 * @param ttlMs   - Cache TTL in milliseconds (from getKeyCacheTTL)
 * @returns AES-GCM CryptoKey for the requested version
 * @throws if the key version is not found, revoked, or cannot be decrypted
 */
async function getVersionKey(
  db: D1Database,
  secret: string,
  version: number,
  ttlMs?: number
): Promise<CryptoKey> {
  // Check cache (with TTL)
  const cached = _versionKeyCache.get(version);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  // Fetch from D1
  const row = await db
    .prepare(
      "SELECT encrypted_key, iv, status FROM encryption_keys WHERE key_version = ?"
    )
    .bind(version)
    .first<{ encrypted_key: string; iv: string; status: string }>();

  if (!row || !row.encrypted_key || !row.iv) {
    throw new Error(`Encryption key version ${version} not found or missing key material`);
  }

  // V4: Reject revoked keys
  if (row.status === "revoked") {
    throw new Error(
      `Encryption key version ${version} has been revoked and cannot be used for decryption`
    );
  }

  // V4: Warn on deprecated keys (still usable but should be rotated)
  if (row.status === "deprecated") {
    console.warn(
      `[credential] Using deprecated key version ${version}. Consider rotating credentials to the active key.`
    );
  }

  const masterKey = await getMasterKey(secret);
  const rawKey = await unwrapVersionKey(row.encrypted_key, row.iv, masterKey);
  const cryptoKey = await importRawAESKey(rawKey);

  // Cache with TTL
  const effectiveTTL = ttlMs ?? _activeCacheTTLMs;
  _versionKeyCache.set(version, {
    key: cryptoKey,
    version,
    expiresAt: Date.now() + effectiveTTL,
  });

  return cryptoKey;
}

/**
 * Fetch the active encryption key version from D1.
 *
 * V4: Only returns keys with status='active'.
 *
 * @param db - D1 database binding
 * @returns { keyVersion, encryptedKey, iv } or null
 */
export async function getActiveEncryptionKey(
  db: D1Database
): Promise<{ keyVersion: number; encryptedKey: string; iv: string } | null> {
  try {
    const row = await db
      .prepare(
        "SELECT key_version, encrypted_key, iv FROM encryption_keys WHERE is_active = 1 AND status = 'active' ORDER BY key_version DESC LIMIT 1"
      )
      .first<{ key_version: number; encrypted_key: string; iv: string }>();

    if (!row || !row.encrypted_key || !row.iv) {
      return null;
    }

    return {
      keyVersion: row.key_version,
      encryptedKey: row.encrypted_key,
      iv: row.iv,
    };
  } catch {
    return null;
  }
}

// ── Decryption Audit Logging ─────────────────────────────

/**
 * Context for decrypt audit logging.
 */
export interface DecryptAuditContext {
  /** The credential ID being decrypted. */
  credentialId?: number;
  /** The credential name being decrypted. */
  credentialName?: string;
  /** The key version used for decryption. */
  keyVersion?: number | null;
  /** IP address of the caller. */
  callerIp?: string;
  /** Authenticated user ID who initiated the decryption. */
  callerUserId?: number | null;
  /** Internal service name (e.g. 'admin/test', 'pet/chat', 'keepalive'). */
  callerService?: string;
}

/**
 * Record a decryption event in the credential_decrypt_logs table.
 *
 * Fire-and-forget: failures are silently logged to console but never
 * block the caller. This is purely an audit trail for security review.
 *
 * @param db     - D1 database binding
 * @param ctx    - Audit context for the decryption event
 * @param success - Whether decryption succeeded
 * @param errorMsg - Error message if decryption failed
 */
export async function logDecryptAudit(
  db: D1Database | undefined,
  ctx: DecryptAuditContext,
  success: boolean,
  errorMsg?: string
): Promise<void> {
  if (!db) return; // No D1 binding available, skip audit

  try {
    await db
      .prepare(
        `INSERT INTO credential_decrypt_logs
         (credential_id, credential_name, key_version, success,
          caller_ip, caller_user_id, caller_service, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        ctx.credentialId ?? null,
        ctx.credentialName ?? "",
        ctx.keyVersion ?? null,
        success ? 1 : 0,
        ctx.callerIp ?? "",
        ctx.callerUserId ?? null,
        ctx.callerService ?? "",
        errorMsg ?? ""
      )
      .run();
  } catch (err) {
    // Audit log failure must never block the caller
    console.error(
      "[credential] Failed to write decrypt audit log:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

// ── Encryption / Decryption (public API) ─────────────────

/**
 * Encrypt a plaintext credential value using AES-GCM.
 *
 * V4: Uses the resolved secret (ENCRYPTION_MASTER_KEY or JWT_SECRET fallback)
 *     for master key derivation. Callers should pass the result of
 *     `resolveEncryptionSecret(env)` as the secret parameter.
 *
 * V3: When `db` is provided, encrypts with the currently active encryption
 * key from D1. Falls back to the legacy secret-derived key when:
 *   - No `db` is provided (caller didn't pass D1)
 *   - No active encryption key found in D1
 *   - D1 query fails
 *
 * @param plaintext - The secret value to encrypt (e.g. API key string)
 * @param secret    - The resolved encryption secret from resolveEncryptionSecret()
 * @param db        - Optional D1 database binding for active key lookup
 * @returns Object with base64-encoded `encryptedValue`, `iv`, and optional `keyVersion`
 */
export async function encryptCredential(
  plaintext: string,
  secret: string,
  db?: D1Database
): Promise<{ encryptedValue: string; iv: string; keyVersion?: number }> {
  // Try D1-backed active key first
  if (db) {
    try {
      const activeKey = await getActiveEncryptionKey(db);
      if (activeKey) {
        const versionKey = await getVersionKey(db, secret, activeKey.keyVersion);
        const ivBytes = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

        const encrypted = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer, tagLength: AES_GCM_TAG_LENGTH },
          versionKey,
          new TextEncoder().encode(plaintext).buffer as ArrayBuffer
        );

        return {
          encryptedValue: bufferToBase64(encrypted),
          iv: bufferToBase64(ivBytes.buffer),
          keyVersion: activeKey.keyVersion,
        };
      }
    } catch (err) {
      console.warn(
        "[credential] D1-backed encryption failed, falling back to legacy:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // Fallback: legacy secret-derived key
  const key = await getMasterKey(secret);
  const ivBytes = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer, tagLength: AES_GCM_TAG_LENGTH },
    key,
    new TextEncoder().encode(plaintext).buffer as ArrayBuffer
  );

  return {
    encryptedValue: bufferToBase64(encrypted),
    iv: bufferToBase64(ivBytes.buffer),
    // keyVersion intentionally omitted for legacy fallback
  };
}

/**
 * Decrypt a credential value encrypted by `encryptCredential`.
 *
 * V4: Supports decryption audit logging via the `auditCtx` parameter.
 *     Uses the resolved secret (ENCRYPTION_MASTER_KEY or JWT_SECRET fallback).
 *
 * V3: Supports multi-version decryption.
 *   - If `keyVersion` is provided and `db` is available, decrypts with the
 *     version-specific key from D1.
 *   - If `keyVersion` is null/undefined or `db` is not provided, falls back
 *     to the legacy secret-derived key.
 *
 * @param encryptedValue - Base64-encoded ciphertext
 * @param iv             - Base64-encoded IV
 * @param secret         - The resolved encryption secret from resolveEncryptionSecret()
 * @param db             - Optional D1 database binding for version key lookup
 * @param keyVersion     - Optional key version number for multi-version decryption
 * @param auditCtx       - Optional audit context for decryption logging
 * @returns The decrypted plaintext credential value
 * @throws if decryption fails (wrong key, corrupted data, etc.)
 */
export async function decryptCredential(
  encryptedValue: string,
  iv: string,
  secret: string,
  db?: D1Database,
  keyVersion?: number | null,
  auditCtx?: DecryptAuditContext
): Promise<string> {
  // Try version-specific key if available
  if (db && keyVersion != null && keyVersion > 0) {
    try {
      const versionKey = await getVersionKey(db, secret, keyVersion);
      const ivBytes = base64ToUint8Array(iv);
      const encryptedBytes = base64ToUint8Array(encryptedValue);

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer, tagLength: AES_GCM_TAG_LENGTH },
        versionKey,
        encryptedBytes.buffer as ArrayBuffer
      );

      const plaintext = new TextDecoder().decode(decrypted);

      // V4: Audit log successful version-specific decryption
      logDecryptAudit(db, { ...auditCtx, keyVersion }, true).catch(() => {});

      return plaintext;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[credential] Version-specific decryption failed for v${keyVersion}, trying legacy fallback:`,
        errMsg
      );
      // V4: Audit log failed version-specific decryption
      logDecryptAudit(db, { ...auditCtx, keyVersion }, false, errMsg).catch(() => {});
    }
  }

  // Legacy fallback: secret-derived key
  try {
    const key = await getMasterKey(secret);
    const ivBytes = base64ToUint8Array(iv);
    const encryptedBytes = base64ToUint8Array(encryptedValue);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer, tagLength: AES_GCM_TAG_LENGTH },
      key,
      encryptedBytes.buffer as ArrayBuffer
    );

    const plaintext = new TextDecoder().decode(decrypted);

    // V4: Audit log successful legacy decryption
    logDecryptAudit(db, auditCtx ?? {}, true).catch(() => {});

    return plaintext;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // V4: Audit log failed legacy decryption
    logDecryptAudit(db, auditCtx ?? {}, false, errMsg).catch(() => {});

    throw err; // Re-throw — caller handles the error
  }
}

/**
 * Re-encrypt a credential value during key rotation.
 *
 * Decrypts with the old key version (or legacy fallback), then re-encrypts
 * with the currently active key.
 *
 * @param encryptedValue - Current base64-encoded ciphertext
 * @param iv             - Current base64-encoded IV
 * @param secret         - The resolved encryption secret
 * @param db             - D1 database binding
 * @param oldKeyVersion  - Previous key version (null for legacy)
 * @returns New { encryptedValue, iv, keyVersion }
 */
export async function reEncryptCredential(
  encryptedValue: string,
  iv: string,
  secret: string,
  db: D1Database,
  oldKeyVersion: number | null
): Promise<{ encryptedValue: string; iv: string; keyVersion: number }> {
  // 1. Decrypt with the old key (no audit log for rotation re-encryption)
  const plaintext = await decryptCredential(encryptedValue, iv, secret, db, oldKeyVersion);

  // 2. Re-encrypt with the current active key
  const result = await encryptCredential(plaintext, secret, db);

  // If the encryption fell back to legacy (no keyVersion returned), re-fetch the active key
  if (!result.keyVersion) {
    const activeKey = await getActiveEncryptionKey(db);
    if (!activeKey) {
      throw new Error("Cannot re-encrypt: no active encryption key found");
    }
    // Force re-encryption with the active D1 key
    const versionKey = await getVersionKey(db, secret, activeKey.keyVersion);
    const ivBytes = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: ivBytes.buffer as ArrayBuffer, tagLength: AES_GCM_TAG_LENGTH },
      versionKey,
      new TextEncoder().encode(plaintext).buffer as ArrayBuffer
    );

    return {
      encryptedValue: bufferToBase64(encrypted),
      iv: bufferToBase64(ivBytes.buffer),
      keyVersion: activeKey.keyVersion,
    };
  }

  return { ...result, keyVersion: result.keyVersion };
}

// ── Masking ──────────────────────────────────────────────

/**
 * Mask a credential value for display (e.g. in lists or audit logs).
 *
 * Shows the first `visiblePrefix` and last `visibleSuffix` characters,
 * replacing everything in between with asterisks.
 *
 * @param value         - The plaintext credential value
 * @param visiblePrefix - Number of chars to show at the start (default 4)
 * @param visibleSuffix - Number of chars to show at the end (default 4)
 * @returns Masked string like "sk-x****626"
 */
export function maskCredential(
  value: string,
  visiblePrefix: number = 4,
  visibleSuffix: number = 4
): string {
  if (!value) return "";
  if (value.length <= visiblePrefix + visibleSuffix) {
    return "*".repeat(value.length);
  }
  const prefix = value.slice(0, visiblePrefix);
  const suffix = value.slice(-visibleSuffix);
  const maskLen = Math.min(value.length - visiblePrefix - visibleSuffix, 20);
  return `${prefix}${"*".repeat(maskLen)}${suffix}`;
}

// ── Credential Type Helpers ──────────────────────────────

/** All supported credential types. */
export const CREDENTIAL_TYPES = [
  "api_key",
  "token",
  "oauth",
  "certificate",
] as const;

export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

/** Human-readable labels for credential types. */
export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  api_key: "API Key",
  token: "Token",
  oauth: "OAuth",
  certificate: "证书",
};

/** All possible credential statuses. */
export const CREDENTIAL_STATUSES = [
  "active",
  "expired",
  "revoked",
  "error",
] as const;

export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

/** Human-readable labels for credential statuses. */
export const CREDENTIAL_STATUS_LABELS: Record<CredentialStatus, string> = {
  active: "正常",
  expired: "已过期",
  revoked: "已吊销",
  error: "异常",
};

// ── Credential Fetcher (for internal services) ───────────

/**
 * Fetch a decrypted credential value from D1 by provider name.
 *
 * This is the primary function used by internal services (like pet/chat.ts)
 * to retrieve API keys from the centralized credential store instead of
 * reading from environment variables.
 *
 * V4: Uses resolveEncryptionSecret for independent key support.
 *     Includes audit logging for decryption events.
 *
 * V3: Supports multi-version decryption via the stored key_version.
 *
 * Falls back to the environment variable if no D1 credential is found,
 * enabling a smooth migration path.
 *
 * @param db          - D1 database binding
 * @param secret      - The resolved encryption secret
 * @param provider    - Service provider identifier (e.g. "xfyun")
 * @param fallbackEnv - Fallback environment variable value (optional)
 * @returns The decrypted credential value, or fallback, or empty string
 */
export async function getCredentialByProvider(
  db: D1Database,
  secret: string,
  provider: string,
  fallbackEnv?: string
): Promise<string> {
  try {
    const row = await db
      .prepare(
        `SELECT id, name, encrypted_value, encryption_iv, key_version FROM credentials
         WHERE provider = ? AND status = 'active'
         ORDER BY updated_at DESC LIMIT 1`
      )
      .bind(provider)
      .first<{ id: number; name: string; encrypted_value: string; encryption_iv: string; key_version: number | null }>();

    if (row && row.encrypted_value && row.encryption_iv) {
      return await decryptCredential(
        row.encrypted_value,
        row.encryption_iv,
        secret,
        db,
        row.key_version,
        {
          credentialId: row.id,
          credentialName: row.name,
          callerService: `provider:${provider}`,
        }
      );
    }
  } catch (err) {
    console.error(
      `[credential] Failed to fetch/decrypt credential for provider "${provider}", falling back to env var:`,
      err
    );
  }

  // Fallback to environment variable
  if (fallbackEnv) {
    console.warn(`[credential] Using fallback env var for provider "${provider}"`);
  }
  return fallbackEnv ?? "";
}

/**
 * Fetch a decrypted credential value from D1 by credential name.
 *
 * V4: Uses resolveEncryptionSecret for independent key support.
 *     Includes audit logging for decryption events.
 *
 * V3: Supports multi-version decryption.
 *
 * @param db     - D1 database binding
 * @param secret - The resolved encryption secret
 * @param name   - Credential name (unique identifier)
 * @param fallbackEnv - Fallback environment variable value (optional)
 * @returns The decrypted credential value, or fallback, or empty string
 */
export async function getCredentialByName(
  db: D1Database,
  secret: string,
  name: string,
  fallbackEnv?: string
): Promise<string> {
  try {
    const row = await db
      .prepare(
        `SELECT id, name, encrypted_value, encryption_iv, key_version FROM credentials
         WHERE name = ? AND status = 'active'
         ORDER BY updated_at DESC LIMIT 1`
      )
      .bind(name)
      .first<{ id: number; name: string; encrypted_value: string; encryption_iv: string; key_version: number | null }>();

    if (row && row.encrypted_value && row.encryption_iv) {
      return await decryptCredential(
        row.encrypted_value,
        row.encryption_iv,
        secret,
        db,
        row.key_version,
        {
          credentialId: row.id,
          credentialName: row.name,
          callerService: `name:${name}`,
        }
      );
    }
  } catch (err) {
    console.error(`Failed to fetch credential for name ${name}:`, err);
  }

  return fallbackEnv ?? "";
}

/**
 * Fetch credential metadata (including endpoint_url and metadata JSON)
 * by provider name, without decrypting the secret value.
 *
 * Used by services that need the endpoint URL and config but will
 * decrypt separately.
 *
 * @param db       - D1 database binding
 * @param provider - Service provider identifier
 * @returns Object with id, endpointUrl, metadata, or null
 */
export async function getCredentialMetaByProvider(
  db: D1Database,
  provider: string
): Promise<{
  id: number;
  endpointUrl: string;
  metadata: Record<string, unknown>;
} | null> {
  try {
    const row = await db
      .prepare(
        `SELECT id, endpoint_url, metadata FROM credentials
         WHERE provider = ? AND status = 'active'
         ORDER BY updated_at DESC LIMIT 1`
      )
      .bind(provider)
      .first<{ id: number; endpoint_url: string; metadata: string | null }>();

    if (!row) return null;

    let metadata: Record<string, unknown> = {};
    try {
      metadata = row.metadata ? JSON.parse(row.metadata) : {};
    } catch {
      // malformed JSON, return empty
    }

    return {
      id: row.id,
      endpointUrl: row.endpoint_url,
      metadata,
    };
  } catch {
    return null;
  }
}

/**
 * Purge the in-memory key cache. Call this after key rotation to ensure
 * subsequent operations use the new key immediately.
 */
export function invalidateKeyCache(): void {
  purgeKeyCache();
}

/**
 * Update the active cache TTL. Called when KEY_CACHE_TTL_SECONDS is
 * configured via environment variable.
 *
 * @param ttlMs - New cache TTL in milliseconds
 */
export function setKeyCacheTTL(ttlMs: number): void {
  _activeCacheTTLMs = ttlMs;
}
