/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Functions environment bindings.
 */
interface Env {
  /** D1 database binding for user data, platforms, desktops, deals. */
  DB: D1Database;
  /** JWT signing secret (configured via wrangler.toml / Dashboard env vars). */
  JWT_SECRET: string;
  /** Brevo API key for transactional email (verification codes). */
  BREVO_API_KEY: string;
  /** smsbao account username for SMS verification codes. */
  SMSBAO_USERNAME: string;
  /** smsbao API key (32-hex MD5 format, used directly). */
  SMSBAO_API_KEY: string;
  /** Cloudflare account ID for Images API (optional, for banner image upload). */
  CF_ACCOUNT_ID?: string;
  /** Cloudflare Images API token (optional, for banner image upload). */
  CF_IMAGES_TOKEN?: string;
  /** KV namespace for JWT token revocation blacklist. */
  TOKEN_BLACKLIST?: KVNamespace;
  /** 讯飞MaaS API key for AI pet chat (format: APIKey:APISecret). */
  XFMAAS_API_KEY?: string;
  /** Independent encryption master key for credential encryption.
   *  When set, credential encryption/decryption uses this key instead of JWT_SECRET.
   *  Must be a high-entropy string (min 32 chars). Changing this value requires
   *  re-encrypting all credentials via the key rotation endpoint.
   *  If not set, falls back to JWT_SECRET for backward compatibility. */
  ENCRYPTION_MASTER_KEY?: string;
  /** Key cache TTL in seconds (default: 300 = 5 minutes).
   *  Controls how long decrypted version keys stay in the in-memory cache. */
  KEY_CACHE_TTL_SECONDS?: string;
}

/**
 * Data injected by middleware and shared between Pages Functions handlers.
 */
interface PageData {
  user?: {
    userId: number;
    email: string;
    username: string;
    isAdmin: boolean;
    roles: string[];
    permissions: string[];
    jti?: string;
  };
}

/**
 * Context object passed to Pages Functions handlers.
 */
interface PageContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
  data: PageData;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  functionPath: string;
}
