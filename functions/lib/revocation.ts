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
export async function isTokenRevoked(
  kv: KVNamespace,
  jti: string
): Promise<boolean> {
  try {
    const value = await kv.get(`${REVOKED_PREFIX}${jti}`);
    return value !== null;
  } catch {
    // If KV is unavailable, fail-open (don't block valid users).
    // This is acceptable because:
    // 1. KV outages are rare and temporary
    // 2. The token will still expire normally
    // 3. Blocking all users during a KV outage is worse
    return false;
  }
}
