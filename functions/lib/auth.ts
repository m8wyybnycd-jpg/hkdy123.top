/**
 * Authentication utilities: PBKDF2 password hashing and JWT management.
 *
 * Uses Web Crypto API exclusively — zero external dependencies.
 * PBKDF2 for password hashing, HMAC-SHA256 for JWT signing/verification.
 * Fully compatible with Cloudflare Workers / Pages Functions.
 */

// ── PBKDF2 Constants ──────────────────────────────────────

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes

// ── Base64 Helpers ────────────────────────────────────────

/** Convert an ArrayBuffer to a base64 string. */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert a base64 string to a Uint8Array. */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Password Hashing ──────────────────────────────────────

/**
 * Hash a password using PBKDF2 (SHA-256, 100000 iterations).
 *
 * @param password - Plain-text password
 * @returns Object with base64-encoded `hash` and `salt`
 */
export async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string }> {
  // Generate a random salt
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Import the password as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  // Derive the hash
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  );

  return {
    hash: bufferToBase64(hashBuffer),
    salt: bufferToBase64(saltBytes.buffer),
  };
}

/**
 * Verify a password against a stored PBKDF2 hash and salt.
 *
 * @param password - Plain-text password to verify
 * @param hash     - Stored base64-encoded hash
 * @param salt     - Stored base64-encoded salt
 * @returns true if the password matches
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  try {
    const saltBytes = base64ToUint8Array(salt);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes.buffer as ArrayBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: PBKDF2_HASH,
      },
      keyMaterial,
      PBKDF2_KEY_LENGTH
    );

    const computedHash = bufferToBase64(hashBuffer);

    // Constant-time comparison to prevent timing attacks
    const a = new TextEncoder().encode(computedHash);
    const b = new TextEncoder().encode(hash);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── Base64url Helpers ─────────────────────────────────────

function toBase64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(str: string): ArrayBuffer {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

const encoder = new TextEncoder();

// ── JWT Management (HS256 via Web Crypto) ────────────────

/** JWT expiration: 7 days in seconds. */
const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/** JWT payload including user identity, roles, and permissions. */
export interface JWTPayload {
  userId: number;
  email: string;
  username: string;
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  /** JWT ID — used for token revocation. Present in verified tokens. */
  jti?: string;
  /** Expiration timestamp (Unix seconds) — used to compute revocation TTL. */
  exp?: number;
}

/** JWT claims including standard JWT fields. */
export interface JWTClaims extends JWTPayload {
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Sign a JWT token with user payload using HMAC-SHA256.
 *
 * @param payload - Must include userId, email, username, isAdmin, roles, and permissions
 * @param secret  - HMAC signing secret from environment
 * @returns Signed JWT string
 */
export async function signJWT(
  payload: JWTPayload,
  secret: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims: JWTClaims = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
    jti: crypto.randomUUID(),
  };

  const headerB64 = toBase64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = toBase64url(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const sigB64 = toBase64url(sig);

  return `${signingInput}.${sigB64}`;
}

/**
 * Verify a JWT token and extract the payload.
 * @throws if the token is invalid, expired, or signature mismatch
 *
 * @returns Decoded payload including userId, email, username, and isAdmin
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  // Verify signature
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64url(sigB64),
    encoder.encode(signingInput)
  );
  if (!valid) throw new Error("Invalid JWT signature");

  // Decode and validate payload
  const payloadJson = new TextDecoder().decode(fromBase64url(payloadB64));
  const payload = JSON.parse(payloadJson);

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("JWT expired");

  return {
    userId: payload.userId as number,
    email: payload.email as string,
    username: payload.username as string,
    isAdmin: payload.isAdmin === true,
    roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
    permissions: Array.isArray(payload.permissions)
      ? (payload.permissions as string[])
      : [],
    jti: payload.jti as string | undefined,
    exp: payload.exp as number,
  };
}

/**
 * Collect the active JWT signing secrets from the environment, in priority
 * order (primary first). When `JWT_SECRET_OLD` is configured it is included as
 * a fallback so tokens signed with the *previous* key remain valid during a
 * key-rotation transition window — preventing a mass forced logout of every
 * active session the moment the primary key changes.
 */
export function getJWTSecrets(env: {
  JWT_SECRET?: string;
  JWT_SECRET_OLD?: string;
}): string[] {
  const secrets: string[] = [];
  if (env.JWT_SECRET) secrets.push(env.JWT_SECRET);
  if (env.JWT_SECRET_OLD) secrets.push(env.JWT_SECRET_OLD);
  return secrets;
}

/**
 * Verify a JWT against one or more HMAC secrets (dual-key transition support).
 *
 * Tries each candidate secret in order; the first that validates wins. This is
 * what makes rotating `JWT_SECRET` safe: set the old value as `JWT_SECRET_OLD`
 * before deploying the new primary, and existing tokens keep working until
 * they naturally expire.
 *
 * @throws if the token is invalid under every candidate secret, or expired
 */
export async function verifyJWTAny(
  token: string,
  secrets: string[]
): Promise<JWTPayload> {
  if (secrets.length === 0) {
    throw new Error("No JWT secrets configured");
  }
  let lastError: Error | null = null;
  for (const secret of secrets) {
    try {
      return await verifyJWT(token, secret);
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw lastError ?? new Error("JWT verification failed");
}
