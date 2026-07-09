/**
 * API Logic Tests — tests register/login/middleware logic
 *
 * These tests mock D1 database and verify the API handler logic
 * without needing a running Cloudflare Workers environment.
 *
 * Run with: npx tsx --test tests/api-logic.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, signJWT, verifyJWT } from "../functions/lib/auth";

const TEST_SECRET = "test_secret_at_least_32_characters_long!!";

// ── Mock D1 Database ───────────────────────────────────────

/**
 * Creates a mock D1Database that simulates Cloudflare D1 behavior.
 * Stores users in memory, supports prepare/bind/first/all/run.
 */
function createMockDB(users: Map<string, any> = new Map()) {
  const mockDB = {
    prepare(sql: string) {
      let boundParams: unknown[] = [];
      const stmt = {
        bind(...params: unknown[]) {
          boundParams = params;
          return stmt;
        },
        async first() {
          // SELECT id FROM users WHERE username = ?
          if (sql.includes("SELECT id FROM users WHERE username")) {
            const username = boundParams[0] as string;
            const user = users.get(username);
            return user ? { id: user.id } : null;
          }
          // SELECT id, username, password_hash, salt, created_at FROM users WHERE username = ?
          if (sql.includes("SELECT id, username, password_hash, salt, created_at")) {
            const username = boundParams[0] as string;
            return users.get(username) || null;
          }
          // SELECT id, username, created_at FROM users WHERE username = ?
          if (sql.includes("SELECT id, username, created_at FROM users WHERE username")) {
            const username = boundParams[0] as string;
            return users.get(username) || null;
          }
          // SELECT id, username, created_at FROM users WHERE id = ?
          if (sql.includes("SELECT id, username, created_at FROM users WHERE id")) {
            const userId = boundParams[0] as number;
            for (const u of users.values()) {
              if (u.id === userId) return { id: u.id, username: u.username, created_at: u.created_at };
            }
            return null;
          }
          return null;
        },
        async all() {
          return { results: [], success: true, meta: {} };
        },
        async run() {
          // INSERT INTO users
          if (sql.includes("INSERT INTO users")) {
            const [username, passwordHash, salt] = boundParams;
            const id = users.size + 1;
            users.set(username as string, {
              id,
              username,
              password_hash: passwordHash,
              salt,
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

// ── Register Logic Tests ───────────────────────────────────

describe("Register API Logic (functions/api/register.ts)", () => {
  let users: Map<string, any>;
  let mockDB: any;

  beforeEach(() => {
    users = new Map();
    mockDB = createMockDB(users);
  });

  it("should reject password shorter than 6 characters", async () => {
    // Simulate register handler logic
    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ username: "testuser", password: "12345" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 400, "password < 6 should return code 400");
    assert.equal(res.status, 400, "HTTP status should be 400");
  });

  it("should reject username shorter than 2 characters", async () => {
    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ username: "a", password: "password123" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 400, "username < 2 should return code 400");
  });

  it("should return 409 when username already exists", async () => {
    // Pre-insert a user
    const { hash, salt } = await hashPassword("existingpass");
    users.set("existinguser", {
      id: 1,
      username: "existinguser",
      password_hash: hash,
      salt,
      created_at: "2025-01-01",
    });

    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ username: "existinguser", password: "password123" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 409, "duplicate username should return code 409");
    assert.equal(res.status, 409, "HTTP status should be 409");
  });

  it("should return token and user on successful registration", async () => {
    const { onRequestPost: register } = await import("../functions/api/register");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ username: "newuser", password: "password123" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await register(context);
    const body = await res.json();
    assert.equal(body.code, 0, "success should return code 0");
    assert.ok(body.data.token, "should return token");
    assert.ok(body.data.user, "should return user");
    assert.equal(body.data.user.username, "newuser");
  });
});

// ── Login Logic Tests ──────────────────────────────────────

describe("Login API Logic (functions/api/login.ts)", () => {
  let users: Map<string, any>;
  let mockDB: any;

  beforeEach(async () => {
    users = new Map();
    mockDB = createMockDB(users);
    // Pre-insert a user
    const { hash, salt } = await hashPassword("correctpass");
    users.set("loginuser", {
      id: 1,
      username: "loginuser",
      password_hash: hash,
      salt,
      created_at: "2025-01-01",
    });
  });

  it("should return 401 when user does not exist", async () => {
    const { onRequestPost: login } = await import("../functions/api/login");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/login", {
        method: "POST",
        body: JSON.stringify({ username: "nonexistent", password: "somepassword" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await login(context);
    const body = await res.json();
    assert.equal(body.code, 401, "nonexistent user should return 401");
    assert.equal(res.status, 401);
  });

  it("should return 401 when password is wrong", async () => {
    const { onRequestPost: login } = await import("../functions/api/login");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/login", {
        method: "POST",
        body: JSON.stringify({ username: "loginuser", password: "wrongpassword" }),
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

  it("should return token on successful login", async () => {
    const { onRequestPost: login } = await import("../functions/api/login");
    const context: any = {
      env: { DB: mockDB, JWT_SECRET: TEST_SECRET },
      request: new Request("http://localhost/api/login", {
        method: "POST",
        body: JSON.stringify({ username: "loginuser", password: "correctpass" }),
        headers: { "Content-Type": "application/json" },
      }),
      data: {},
      params: {},
      next: async () => new Response(),
    };
    const res = await login(context);
    const body = await res.json();
    assert.equal(body.code, 0, "successful login should return code 0");
    assert.ok(body.data.token, "should return token");
    assert.equal(body.data.user.username, "loginuser");
  });
});

// ── JWT Token Lifecycle Tests ──────────────────────────────

describe("JWT Token Lifecycle", () => {
  it("token signed by register should be verifiable by verifyJWT", async () => {
    const token = await signJWT({ userId: 1, username: "lifecycle_test" }, TEST_SECRET);
    const payload = await verifyJWT(token, TEST_SECRET);
    assert.equal(payload.userId, 1);
    assert.equal(payload.username, "lifecycle_test");
  });

  it("token should expire in 7 days", async () => {
    const token = await signJWT({ userId: 1, username: "expiry_test" }, TEST_SECRET);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    // Should be approximately 7 days (604800 seconds), allow 5 second tolerance
    assert.ok(
      Math.abs(expiresIn - 604800) < 5,
      `token should expire in ~604800 seconds, got ${expiresIn}`
    );
  });
});

// ── AuthContext Token Key Consistency ──────────────────────

describe("Token Key Consistency", () => {
  it("AuthContext and ApiClient should use the same localStorage key", async () => {
    // Read both files and check they use the same TOKEN_KEY
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

    // Extract TOKEN_KEY value from both files
    const authKeyMatch = authContextContent.match(/TOKEN_KEY\s*=\s*["']([^"']+)["']/);
    const apiKeyMatch = apiContent.match(/TOKEN_KEY\s*=\s*["']([^"']+)["']/);

    assert.ok(authKeyMatch, "AuthContext should define TOKEN_KEY");
    assert.ok(apiKeyMatch, "ApiClient should define TOKEN_KEY");
    assert.equal(
      authKeyMatch[1],
      apiKeyMatch[1],
      "TOKEN_KEY should be the same in AuthContext and ApiClient"
    );
  });
});
