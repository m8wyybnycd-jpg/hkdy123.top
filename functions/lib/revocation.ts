/**
 * JWT Revocation utilities — token blacklist via Cloudflare KV.
 *
 * When a user logs out, their JWT's `jti` is stored in KV with a TTL
 * equal to the token's remaining lifetime. The middleware checks this
 * blacklist on every request and rejects revoked tokens.
 *
 * KV namespace binding: TOKEN_BLACKLIST
 * Key format: `revoked:{jti}`
 * Value: `{ revokedAt: ISO8601, userId: number }`
 * TTL: remaining seconds until token expiry (auto-cleanup)
 */

/** KV key prefix for revoked tokens. */
const REVOKED_PREFIX = "revoked:";

/**
 * Revoke a JWT by storing its `jti` in the KV blacklist.
 *
 * @param kv       - Cloudflare KV namespace binding
 * @param jti      - JWT ID from the token's claims
 * @param exp      - Token expiration timestamp (Unix seconds)
 * @param userId   - User ID for audit purposes
 */
export async function revokeToken(
  kv: KVNamespace,
  jti: string,
  exp: number,
  userId: number
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp - now;

  // Only store if the token hasn't already expired
  if (ttl <= 0) return;

  await kv.put(
    `${REVOKED_PREFIX}${jti}`,
    JSON.stringify({ revokedAt: new Date().toISOString(), userId }),
    { expirationTtl: ttl }
  );
}

/**
 * Check if a JWT has been revoked (is in the KV blacklist).
 *
 * @param kv  - Cloudflare KV namespace binding
 * @param jti - JWT ID from the token's claims
 * @returns true if the token has been revoked
 */
/**
 * Check if a JWT has been revoked (is in the KV blacklist).
 *
 * Fail-closed vs fail-open policy:
 * - If `kvConfigured` is false (KV binding absent, e.g. local dev or a
 *   transitional deploy), return `false` (fail-open) so existing sessions
 *   are not mass-invalidated when the binding is temporarily missing.
 * - If `kvConfigured` is true but the KV read throws (outage / rate-limit),
 *   return `true` (fail-closed): during a KV outage we must NOT trust a
 *   token that might have been logged out — better to force re-auth than
 *   accept a potentially-revoked session.
 *
 * @param kv           - Cloudflare KV namespace binding
 * @param jti          - JWT ID from the token's claims
 * @param kvConfigured - whether the TOKEN_BLACKLIST binding is present
 * @returns true if the token has been revoked (or KV is down while configured)
 */
export async function isTokenRevoked(
  kv: KVNamespace,
  jti: string,
  kvConfigured: boolean
): Promise<boolean> {
  if (!kvConfigured) return false;
  try {
    const value = await kv.get(`${REVOKED_PREFIX}${jti}`);
    return value !== null;
  } catch {
    // KV is configured but the read failed — fail-closed.
    return true;
  }
}
