/**
 * Environment bindings for the keepalive Worker.
 * These mirror the bindings configured in wrangler.toml.
 */

interface Env {
  /** D1 database binding (shared with main Pages project) */
  DB: D1Database;

  /** ENCRYPTION_MASTER_KEY for credential decryption (primary) */
  ENCRYPTION_MASTER_KEY?: string;

  /** JWT_SECRET for credential decryption (fallback) */
  JWT_SECRET: string;

  /** 讯飞MaaS API Key (fallback if D1 credential is missing) */
  XFMAAS_API_KEY?: string;

  /** Admin token for manual trigger via /trigger endpoint */
  KEEPALIVE_ADMIN_TOKEN?: string;
}
