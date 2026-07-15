/**
 * API Logic Tests — tests register/login/middleware logic
 *
 * These tests mock D1 database and verify the API handler logic
 * without needing a running Cloudflare Workers environment.
 *
 * The handlers implement the *current* architecture:
 *   - Register: email + 6-digit verification code + password, returns an
 *     HttpOnly cookie (no token in the JSON body).
 *   - Login: email-or-username + password, returns an HttpOnly cookie.
 *   - Auth: PBKDF2 password hashing + HMAC-SHA256 JWT (Web Crypto, no jose).
 *
 * Run with: npx tsx --test tests/api-logic.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, signJWT, verifyJWT } from "../functions/lib/auth";

const TEST_SECRET = "test_secret_at_least_32_characters_long!!";

// ── Mock D1 Database ───────────────────────────────────────

interface MockUser {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  salt: string;
  is_admin: number;
  created_at: string;
}

interface MockCode {
  id: number;
  email: string;
  code: string;
  expires_at: string;
  created_at: string;
  used: number;
  failed_attempts: number;
}

interface MockState {
  users: MockUser[];
  codes: MockCode[];
  settings: Map<string, string>;
  loginLogs: Array<Record<string, unknown>>;
  nextUserId: number;
  nextCodeId: number;
}

/**
 * Creates a mock D1Database that simulates Cloudflare D1 behavior and supports
 * every SQL statement the current register/login handlers issue:
 * settings lookup, verification-code lookup, users lookup (by email / username
 * / email-or-username), user insert, login-log insert, and rate-limit count.
 */
function createMockDB(state: MockState) {
  const mockDB: any = {
    prepare(sql: string) {
      let boundParams: unknown[] = [];
      const stmt = {
        bind(...params: unknown[]) {
          boundParams = params;
          return stmt;
        },
        async first() {
          // settings: SELECT value FROM settings WHERE key = ?
          if (sql.includes("FROM settings WHERE key =")) {
            const key = boundParams[0] as string;
            const value = state.settings.get(key);
            return value !== undefined ? { value } : null;
          }
          // verification_codes: latest unused, non-expired code for an email
          if (sql.includes("FROM verification_codes WHERE email = ? AND used = 0")) {
            const email = boundParams[0] as string;
            const nowIso = new Date().toISOString();
            const matches = state.codes
              .filter(
                (c) =>
                  c.email === email &&
                  c.used === 0 &&
                  c.expires_at > nowIso
              )
              .sort((a, b) => b.created_at.localeCompare(a.created_at));
            return matches[0] ?? null;
          }
          // users: uniqueness check by email — SELECT id FROM users WHERE email = ?
          if (
            sql.includes("SELECT id FROM users WHERE email = ?") &&
            !sql.includes("OR LOWER") &&
            !sql.includes("is_admin")
          ) {
            const email = boundParams[0] as string;
            const u = state.users.find((x) => x.email === email);
            return u ? { id: u.id } : null;
          }
          // users: username availability — SELECT id FROM users WHERE username = ?
          if (sql.includes("SELECT id FROM users WHERE username = ?")) {
            const username = boundParams[0] as string;
            const u = state.users.find((x) => x.username === username);
            return u ? { id: u.id } : null;
          }
          // users: login lookup by email OR username
          if (sql.includes("FROM users WHERE email = ? OR LOWER(username) = ?")) {
            const email = boundParams[0] as string;
            const username = String(boundParams[1] ?? "").toLowerCase();
            const u = state.users.find(
              (x) =>
                x.email === email ||
                x.username.toLowerCase() === username
            );
            return u
              ? {
                  id: u.id,
                  email: u.email,
                  username: u.username,
                  password_hash: u.password_hash,
                  salt: u.salt,
                  is_admin: u.is_admin,
                  created_at: u.created_at,
                }
              : null;
          }
          // users: select after register — id, email, username, is_admin, created_at
          if (
            sql.includes(
              "SELECT id, email, username, is_admin, created_at FROM users WHERE email = ?"
            )
          ) {
            const email = boundParams[0] as string;
            const u = state.users.find((x) => x.email === email);
            return u
              ? {
                  id: u.id,
                  email: u.email,
                  username: u.username,
                  is_admin: u.is_admin,
                  created_at: u.created_at,
                }
              : null;
          }
          // login_logs: rate-limit count
          if (sql.includes("COUNT(*) as count FROM login_logs")) {
            const ip = boundParams[0] as string;
            const cutoff = boundParams[1] as string;
            const count = state.loginLogs.filter(
              (l) =>
                l.ip === ip &&
                l.status === "fail" &&
                (l.created_at as string) > cutoff
            ).length;
            return { count };
          }
          return null;
        },
        async all() {
          // roles / permissions queries — return empty (new users have none)
          return { results: [], success: true, meta: {} };
        },
        async run() {
          if (sql.includes("UPDATE verification_codes SET used = 1")) {
            const id = boundParams[0] as number;
            const c = state.codes.find((x) => x.id === id);
            if (c) c.used = 1;
            return { success: true, meta: {} };
          }
          if (sql.includes("UPDATE verification_codes SET failed_attempts")) {
            const id = boundParams[0] as number;
            const c = state.codes.find((x) => x.id === id);
            if (c) c.failed_attempts = (c.failed_attempts || 0) + 1;
            return { success: true, meta: {} };
          }
          if (sql.includes("INSERT INTO users")) {
            const [email, username, passwordHash, salt, createdAt, updatedAt] =
              boundParams as [string, string, string, string, string, string];
            const u: MockUser = {
              id: state.nextUserId++,
              email,
              username,
              password_hash: passwordHash,
              salt,
              is_admin: 0,
              created_at: createdAt,
            };
            state.users.push(u);
            return { success: true, meta: {} };
          }
          if (sql.includes("INSERT INTO login_logs")) {
            state.loginLogs.push({
              ip: boundParams[2] as string,
              status: boundParams[3] as string,
              created_at: new Date().toISOString(),
            });
            return { success: true, meta: {} };
          }
          return { success: true, meta: {} };
        },
      };
      return stmt;
    },
  };
  return mockDB;
}

/** Build a fresh verification code row that is valid right now. */
function makeValidCode(email: string, code = "123456"): MockCode {
  const now = Date.now();
  return {
    id: 0,
    email,
    code,
    created_at: new Date(now - 60_000).toISOString(),
    expires_at: new Date(now + 10 * 60_000).toISOString(),
    used: 0,
    failed_attempts: 0,
  };
}

/** Seed a user with a real PBKDF2 hash for the given password. */
async function seedUser(
  state: MockState,
  email: string,
  username: string,
  password: string
): Promise<void> {
  const { hash, salt } = await hashPassword(password);
  state.users.push({
    id: state.nextUserId++,
    email,
    username,
    password_hash: hash,
    salt,
    is_admin: 0,
    created_at: new Date().toISOString(),
  });
}

function newState(): MockState {
  return {
    users: [],
    codes: [],
    settings: new Map(),
    loginLogs: [],
    nextUserId: 1,
    nextCodeId: 1,
  };
}

// ── Register Logic Tests ───────────────────────────────────

describe("Register API Logic (functions/api/register.ts)", () => {
  let state: MockState;
  let mockDB: any;

  beforeEach(() => {
    state = newState();
    mockDB = createMockDB(state);
  });

  it("should reject an invalid email format", async () => {
    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", code: "123456", password: "password123" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 400, "invalid email should return code 400");
    assert.match(body.message, /邮箱格式/, "should complain about email format");
  });

  it("should reject a password shorter than the configured minimum", async () => {
    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ email: "newuser@example.com", code: "123456", password: "12345" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 400, "short password should return code 400");
    assert.match(body.message, /密码至少/, "should complain about password length");
  });

  it("should return 409 when the email is already registered", async () => {
    state.codes.push(makeValidCode("existing@example.com"));
    await seedUser(state, "existing@example.com", "existing", "password123");

    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ email: "existing@example.com", code: "123456", password: "password123" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 409, "duplicate email should return code 409");
    assert.match(body.message, /已被注册/, "should say email already registered");
  });

  it("should return the user and set an HttpOnly cookie on success", async () => {
    state.codes.push(makeValidCode("newuser@example.com"));

    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ email: "newuser@example.com", code: "123456", password: "password123" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 0, "success should return code 0");
    assert.equal(res.status, 201, "successful registration should return 201");
    assert.ok(body.data.user, "should return user object");
    assert.equal(body.data.user.email, "newuser@example.com");
    // Token is delivered via HttpOnly cookie, not in the JSON body.
    assert.equal(body.data.token, undefined, "token must NOT be in the JSON body");
    const setCookie = res.headers.get("Set-Cookie") || "";
    assert.match(setCookie, /__Host-auth_token=/, "should set the __Host- auth cookie");
    assert.match(setCookie, /HttpOnly/, "cookie must be HttpOnly");
  });
});

// ── Login Logic Tests ──────────────────────────────────────

describe("Login API Logic (functions/api/login.ts)", () => {
  let state: MockState;
  let mockDB: any;

  beforeEach(async () => {
    state = newState();
    mockDB = createMockDB(state);
    await seedUser(state, "loginuser@example.com", "loginuser", "correctpass");
  });

  it("should return 401 when the user does not exist", async () => {
    const { onRequestPost: login } = await import("../functions/api/login");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/login", {
        method: "POST",
        body: JSON.stringify({ email: "nonexistent@example.com", password: "somepassword" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await login(context);
    const body = await res.json();
    assert.equal(body.code, 401, "nonexistent user should return 401");
    assert.match(body.message, /账号或密码错误/, "should return generic auth error");
  });

  it("should return 401 when the password is wrong", async () => {
    const { onRequestPost: login } = await import("../functions/api/login");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/login", {
        method: "POST",
        body: JSON.stringify({ email: "loginuser@example.com", password: "wrongpassword" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await login(context);
    const body = await res.json();
    assert.equal(body.code, 401, "wrong password should return 401");
  });

  it("should accept login by username as well as email", async () => {
    const { onRequestPost: login } = await import("../functions/api/login");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/login", {
        method: "POST",
        body: JSON.stringify({ email: "LOGINUSER", password: "correctpass" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await login(context);
    const body = await res.json();
    assert.equal(body.code, 0, "login by username should succeed");
  });

  it("should return the user and set an HttpOnly cookie on success", async () => {
    const { onRequestPost: login } = await import("../functions/api/login");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/login", {
        method: "POST",
        body: JSON.stringify({ email: "loginuser@example.com", password: "correctpass" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await login(context);
    const body = await res.json();
    assert.equal(body.code, 0, "successful login should return code 0");
    assert.ok(body.data.user, "should return user object");
    assert.equal(body.data.user.email, "loginuser@example.com");
    assert.equal(body.data.token, undefined, "token must NOT be in the JSON body");
    const setCookie = res.headers.get("Set-Cookie") || "";
    assert.match(setCookie, /__Host-auth_token=/, "should set the __Host- auth cookie");
    assert.match(setCookie, /HttpOnly/, "cookie must be HttpOnly");
  });
});

// ── JWT Token Lifecycle Tests ──────────────────────────────

describe("JWT Token Lifecycle", () => {
  it("token signed by register should be verifiable by verifyJWT", async () => {
    const token = await signJWT({ userId: 1, email: "lifecycle_test@example.com", username: "lifecycle_test", isAdmin: false, roles: [], permissions: [] }, TEST_SECRET);
    const payload = await verifyJWT(token, TEST_SECRET);
    assert.equal(payload.userId, 1);
    assert.equal(payload.email, "lifecycle_test@example.com");
  });

  it("token should expire in ~7 days", async () => {
    const token = await signJWT({ userId: 1, email: "expiry_test@example.com", username: "expiry_test", isAdmin: false, roles: [], permissions: [] }, TEST_SECRET);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    assert.ok(
      Math.abs(expiresIn - 604800) < 5,
      `token should expire in ~604800 seconds, got ${expiresIn}`
    );
  });
});

// ── Cookie-based Auth Consistency ──────────────────────────

describe("Cookie-based Auth Consistency", () => {
  it("AuthContext and ApiClient should both rely on cookie auth (no TOKEN_KEY)", async () => {
    // Read both files and confirm they use cookie auth, not a localStorage token.
    const { readFileSync } = await import("node:fs");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const projectRoot = join(__dirname, "..");

    const authContextContent = readFileSync(
      join(projectRoot, "src/contexts/AuthContext.tsx"),
      "utf-8"
    );
    const apiContent = readFileSync(
      join(projectRoot, "src/services/api.ts"),
      "utf-8"
    );

    // Both must use cookie-based auth via fetch credentials.
    assert.ok(
      authContextContent.includes("credentials: \"include\""),
      "AuthContext should send credentials: 'include'"
    );
    assert.ok(
      apiContent.includes("credentials: \"include\""),
      "ApiClient should send credentials: 'include'"
    );
    // Neither should fall back to a manually-managed localStorage token.
    assert.ok(
      !authContextContent.includes("TOKEN_KEY"),
      "AuthContext should NOT use a localStorage TOKEN_KEY"
    );
    assert.ok(
      !apiContent.includes("TOKEN_KEY"),
      "ApiClient should NOT use a localStorage TOKEN_KEY"
    );
  });
});
