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
