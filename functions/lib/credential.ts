/**
 * Credential encryption & management utilities.
 *
 * Uses Web Crypto API exclusively — zero external dependencies.
 * AES-GCM 256-bit encryption for credential values at rest.
 * Each credential gets a unique random IV per encryption operation.
 *
 * Fully compatible with Cloudflare Workers / Pages Functions.
 */

// ── AES-GCM Constants ────────────────────────────────────

const AES_KEY_LENGTH = 256; // bits
const AES_IV_LENGTH = 12; // bytes (96-bit IV is recommended for GCM)
const AES_GCM_TAG_LENGTH = 128; // bits

// ── Base64 Helpers (shared with auth.ts pattern) ─────────

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

// ── Encryption / Decryption ──────────────────────────────

/**
 * Derive an AES-GCM CryptoKey from the JWT secret (reuses existing env var,
 * avoiding the need for a new env var). Uses HKDF-like derivation via PBKDF2.
 *
 * @param secret - The JWT_SECRET from environment
 * @returns A non-extractable AES-GCM CryptoKey
 */
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

/** Cached AES key per-request (avoid re-deriving on every call). */
let _cachedKey: CryptoKey | null = null;
let _cachedSecret = "";

/**
 * Encrypt a plaintext credential value using AES-GCM.
 *
 * @param plaintext - The secret value to encrypt (e.g. API key string)
 * @param secret    - The JWT_SECRET from environment (used as key derivation input)
 * @returns Object with base64-encoded `encryptedValue` and `iv`
 */
export async function encryptCredential(
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

/**
 * Decrypt a credential value encrypted by `encryptCredential`.
 *
 * @param encryptedValue - Base64-encoded ciphertext
 * @param iv             - Base64-encoded IV
 * @param secret         - The JWT_SECRET from environment
 * @returns The decrypted plaintext credential value
 * @throws if decryption fails (wrong key, corrupted data, etc.)
 */
export async function decryptCredential(
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

/**
 * Get or derive the cached AES key.
 * Caches per-process to avoid expensive PBKDF2 on every call.
 */
async function getAESKey(secret: string): Promise<CryptoKey> {
  if (_cachedKey && _cachedSecret === secret) {
    return _cachedKey;
  }
  _cachedKey = await deriveAESKey(secret);
  _cachedSecret = secret;
  return _cachedKey;
}

// ── Masking ──────────────────────────────────────────────

/**
 * Mask a credential value for display (e.g. in lists or audit logs).
 *
 * Shows the first `visiblePrefix` and last `visibleSuffix` characters,
 * replacing everything in between with asterisks.
 *
 * @param value       - The plaintext credential value
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
 * Falls back to the environment variable if no D1 credential is found,
 * enabling a smooth migration path.
 *
 * @param db          - D1 database binding
 * @param secret      - JWT_SECRET for decryption
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
        `SELECT encrypted_value, encryption_iv FROM credentials
         WHERE provider = ? AND status = 'active'
         ORDER BY updated_at DESC LIMIT 1`
      )
      .bind(provider)
      .first();

    if (row && row.encrypted_value && row.encryption_iv) {
      return await decryptCredential(
        row.encrypted_value as string,
        row.encryption_iv as string,
        secret
      );
    }
  } catch (err) {
    console.error(`Failed to fetch credential for provider ${provider}:`, err);
  }

  // Fallback to environment variable
  return fallbackEnv ?? "";
}

/**
 * Fetch a decrypted credential value from D1 by credential name.
 *
 * @param db     - D1 database binding
 * @param secret - JWT_SECRET for decryption
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
        `SELECT encrypted_value, encryption_iv FROM credentials
         WHERE name = ? AND status = 'active'
         ORDER BY updated_at DESC LIMIT 1`
      )
      .bind(name)
      .first();

    if (row && row.encrypted_value && row.encryption_iv) {
      return await decryptCredential(
        row.encrypted_value as string,
        row.encryption_iv as string,
        secret
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
      .first();

    if (!row) return null;

    let metadata: Record<string, unknown> = {};
    try {
      metadata = row.metadata ? JSON.parse(row.metadata as string) : {};
    } catch {
      // malformed JSON, return empty
    }

    return {
      id: row.id as number,
      endpointUrl: row.endpoint_url as string,
      metadata,
    };
  } catch {
    return null;
  }
}
