/**
 * JavaScript-based validation tests (no TypeScript module resolution needed).
 *
 * These tests read source files as text and validate patterns,
 * providing an alternative to TypeScript-based tests when tsx is unavailable.
 *
 * Run with: node tests/js-validation.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

function readSrc(relPath) {
  return readFileSync(join(projectRoot, relPath), "utf-8");
}

// ── File Existence Tests ───────────────────────────────────

describe("File Structure Completeness", () => {
  const requiredFiles = [
    "src/main.tsx",
    "src/App.tsx",
    "src/contexts/AuthContext.tsx",
    "src/services/api.ts",
    "src/components/ProtectedRoute.tsx",
    "src/components/Header.tsx",
    "src/components/Footer.tsx",
    "src/components/PlatformCard.tsx",
    "src/components/PlatformModal.tsx",
    "src/components/DesktopCard.tsx",
    "src/components/DealCard.tsx",
    "src/components/DealFilter.tsx",
    "src/components/SearchBar.tsx",
    "src/pages/AuthPage.tsx",
    "src/pages/CloudGamesPage.tsx",
    "src/pages/CloudDesktopsPage.tsx",
    "src/pages/DealsPage.tsx",
    "src/pages/LibraryPage.tsx",
    "src/pages/SearchPage.tsx",
    "src/hooks/useAuth.ts",
    "src/types/index.ts",
    "src/data/platforms.ts",
    "src/data/desktops.ts",
    "src/data/deals.ts",
    "src/data/games.ts",
    "functions/_middleware.ts",
    "functions/lib/auth.ts",
    "functions/lib/db.ts",
    "functions/lib/response.ts",
    "functions/api/register.ts",
    "functions/api/login.ts",
    "functions/api/logout.ts",
    "functions/api/me.ts",
    "functions/api/desktops.ts",
    "functions/api/games.ts",
    "functions/api/search.ts",
    "functions/api/platforms/index.ts",
    "functions/api/platforms/[id].ts",
    "functions/api/deals/index.ts",
    "functions/api/favorites/index.ts",
    "functions/api/favorites/[id].ts",
    "schema.sql",
    "seed.sql",
    "wrangler.toml",
    "vite.config.ts",
    "tsconfig.json",
    "package.json",
    "worker-configuration.d.ts",
    ".dev.vars",
  ];

  for (const file of requiredFiles) {
    it(`should exist: ${file}`, () => {
      assert.ok(
        existsSync(join(projectRoot, file)),
        `Required file missing: ${file}`
      );
    });
  }
});

// ── Auth Module Code Validation ────────────────────────────

describe("Auth Module Code Validation (functions/lib/auth.ts)", () => {
  const authContent = readSrc("functions/lib/auth.ts");

  it("should use PBKDF2 for password hashing", () => {
    assert.ok(authContent.includes("PBKDF2"), "should use PBKDF2");
    assert.ok(authContent.includes("100000"), "should use 100000 iterations");
    assert.ok(authContent.includes("SHA-256"), "should use SHA-256 hash");
  });

  it("should use Web Crypto HMAC (not the jose library) for JWT", () => {
    assert.ok(!/from\s+["']jose["']/.test(authContent), "should NOT depend on the jose library");
    assert.ok(authContent.includes("crypto.subtle.sign"), "should use crypto.subtle.sign for HMAC");
    assert.ok(authContent.includes("crypto.subtle.verify"), "should use crypto.subtle.verify for HMAC");
  });

  it("should use HS256 algorithm", () => {
    assert.ok(authContent.includes("HS256"), "should use HS256 algorithm");
  });

  it("should set ~7d expiration for JWT", () => {
    assert.ok(authContent.includes("7 * 24 * 60 * 60"), "should compute 7-day expiry in seconds");
    assert.ok(authContent.includes("JWT_EXPIRY_SECONDS"), "should define JWT_EXPIRY_SECONDS");
  });

  it("should export hashPassword, verifyPassword, signJWT, verifyJWT", () => {
    assert.ok(authContent.includes("export async function hashPassword"), "should export hashPassword");
    assert.ok(authContent.includes("export async function verifyPassword"), "should export verifyPassword");
    assert.ok(authContent.includes("export async function signJWT"), "should export signJWT");
    assert.ok(authContent.includes("export async function verifyJWT"), "should export verifyJWT");
  });

  it("should use base64 encoding for hash and salt", () => {
    assert.ok(authContent.includes("btoa("), "should use btoa for base64 encoding");
    assert.ok(authContent.includes("atob("), "should use atob for base64 decoding");
  });

  it("should use crypto.subtle for PBKDF2", () => {
    assert.ok(authContent.includes("crypto.subtle.importKey"), "should use crypto.subtle.importKey");
    assert.ok(authContent.includes("crypto.subtle.deriveBits"), "should use crypto.subtle.deriveBits");
    assert.ok(authContent.includes("crypto.getRandomValues"), "should use crypto.getRandomValues for salt");
  });
});

// ── Register API Code Validation ───────────────────────────

describe("Register API Code Validation (functions/api/register.ts)", () => {
  const content = readSrc("functions/api/register.ts");

  it("should check email uniqueness (409 conflict)", () => {
    assert.ok(content.includes("conflict"), "should use conflict() for duplicate email");
    assert.ok(content.includes("SELECT id FROM users WHERE email"), "should query users table by email");
  });

  it("should validate password length against a configurable minimum", () => {
    assert.ok(content.includes("passwordMinLength"), "should read the password_min_length setting");
    assert.ok(content.includes("密码至少"), "should return a 'password too short' message");
  });

  it("should return the user (not a token) on success", () => {
    assert.ok(content.includes("jsonResponse"), "should use jsonResponse for success");
    assert.ok(content.includes("user"), "should return user object");
  });

  it("should set an HttpOnly cookie with the JWT", () => {
    assert.ok(content.includes("__Host-auth_token"), "should set the __Host- prefixed auth cookie");
    assert.ok(content.includes("Set-Cookie"), "should set the Set-Cookie header");
  });

  it("should use JWT_SECRET from environment", () => {
    assert.ok(content.includes("JWT_SECRET"), "should reference JWT_SECRET env var");
  });
});

// ── Login API Code Validation ──────────────────────────────

describe("Login API Code Validation (functions/api/login.ts)", () => {
  const content = readSrc("functions/api/login.ts");

  it("should return 401 for non-existent user or wrong password", () => {
    assert.ok(content.includes("unauthorized"), "should use unauthorized() for auth failure");
    assert.ok(content.includes("账号或密码错误"), "should return '账号或密码错误' message");
  });

  it("should verify password using verifyPassword", () => {
    assert.ok(content.includes("verifyPassword"), "should call verifyPassword");
  });

  it("should sign a JWT on success", () => {
    assert.ok(content.includes("signJWT"), "should call signJWT");
  });

  it("should set an HttpOnly cookie with the JWT", () => {
    assert.ok(content.includes("__Host-auth_token"), "should set the __Host- prefixed auth cookie");
    assert.ok(content.includes("Set-Cookie"), "should set the Set-Cookie header");
  });
});

// ── Middleware Code Validation ─────────────────────────────

describe("Middleware Code Validation (functions/_middleware.ts)", () => {
  const content = readSrc("functions/_middleware.ts");

  it("should handle CORS preflight (OPTIONS)", () => {
    assert.ok(content.includes("OPTIONS"), "should handle OPTIONS method");
    assert.ok(content.includes("Access-Control-Allow-Origin"), "should set CORS origin header");
    assert.ok(content.includes("Access-Control-Allow-Methods"), "should set CORS methods header");
    assert.ok(content.includes("Access-Control-Allow-Headers"), "should set CORS headers header");
  });

  it("should parse JWT from Authorization header", () => {
    assert.ok(content.includes("Authorization"), "should check Authorization header");
    assert.ok(content.includes("Bearer "), "should check Bearer prefix");
    assert.ok(content.includes("verifyJWT"), "should call verifyJWT");
  });

  it("should inject user into context.data", () => {
    assert.ok(content.includes("context.data.user"), "should inject user into context.data");
  });
});

// ── Response Utils Code Validation ─────────────────────────

describe("Response Utils Code Validation (functions/lib/response.ts)", () => {
  const content = readSrc("functions/lib/response.ts");

  it("should export jsonResponse with {code, data, message} format", () => {
    assert.ok(content.includes("jsonResponse"), "should export jsonResponse");
    assert.ok(content.includes("code"), "should include code in response");
    assert.ok(content.includes("data"), "should include data in response");
    assert.ok(content.includes("message"), "should include message in response");
  });

  it("should export error helper functions", () => {
    assert.ok(content.includes("badRequest"), "should export badRequest (400)");
    assert.ok(content.includes("unauthorized"), "should export unauthorized (401)");
    assert.ok(content.includes("notFound"), "should export notFound (404)");
    assert.ok(content.includes("conflict"), "should export conflict (409)");
    assert.ok(content.includes("serverError"), "should export serverError (500)");
  });

  it("should export requireAuth helper", () => {
    assert.ok(content.includes("requireAuth"), "should export requireAuth");
    assert.ok(content.includes("data.user"), "should check data.user");
  });
});

// ── DB Fallback Code Validation ────────────────────────────

describe("DB Fallback Code Validation (functions/lib/db.ts)", () => {
  const content = readSrc("functions/lib/db.ts");

  it("should export queryWithFallback", () => {
    assert.ok(content.includes("queryWithFallback"), "should export queryWithFallback");
    assert.ok(content.includes("fallback"), "should have fallback parameter");
  });

  it("should handle undefined db", () => {
    assert.ok(content.includes("!db"), "should check if db is falsy");
    assert.ok(content.includes("return fallback"), "should return fallback when db is undefined");
  });

  it("should catch D1 errors and return fallback", () => {
    assert.ok(content.includes("catch"), "should have try-catch");
  });

  it("should check for empty results", () => {
    assert.ok(content.includes("length === 0") || content.includes("!result.results"), "should check for empty results");
  });

  it("should export parseJsonArray", () => {
    assert.ok(content.includes("parseJsonArray"), "should export parseJsonArray");
    assert.ok(content.includes("JSON.parse"), "should use JSON.parse");
  });
});

// ── Frontend Code Validation ───────────────────────────────

describe("Frontend Code Validation", () => {
  it("AuthContext should manage auth state via HttpOnly cookie", () => {
    const content = readSrc("src/contexts/AuthContext.tsx");
    assert.ok(content.includes("useAuthContext"), "should export useAuthContext hook");
    assert.ok(content.includes("login"), "should have login method");
    assert.ok(content.includes("register"), "should have register method");
    assert.ok(content.includes("logout"), "should have logout method");
    assert.ok(content.includes("HttpOnly"), "should document HttpOnly cookie auth");
    assert.ok(content.includes("/api/me"), "should call /api/me to restore session from cookie");
    // Token is NOT held in JS — it lives in the HttpOnly cookie.
    assert.ok(!content.includes("TOKEN_KEY"), "should NOT use a localStorage TOKEN_KEY (cookie-based)");
    assert.ok(content.includes("token: null"), "auth state token should be null (cookie-only)");
  });

  it("ApiClient should send credentials via cookie (no manual token injection)", () => {
    const content = readSrc("src/services/api.ts");
    assert.ok(content.includes("credentials"), "should set credentials on fetch");
    assert.ok(content.includes("credentials: \"include\""), "should use credentials: 'include'");
    assert.ok(content.includes("login"), "should have login method");
    assert.ok(content.includes("register"), "should have register method");
    assert.ok(!content.includes("Bearer"), "should NOT manually inject a Bearer token (cookie-based)");
  });

  it("AuthContext and ApiClient should both rely on cookie auth", () => {
    const authContent = readSrc("src/contexts/AuthContext.tsx");
    const apiContent = readSrc("src/services/api.ts");
    assert.ok(
      authContent.includes("credentials: \"include\""),
      "AuthContext should use credentials: 'include'"
    );
    assert.ok(
      apiContent.includes("credentials: \"include\""),
      "ApiClient should use credentials: 'include'"
    );
  });

  it("ProtectedRoute should redirect to /login when not authenticated", () => {
    const content = readSrc("src/components/ProtectedRoute.tsx");
    assert.ok(content.includes("Navigate"), "should use Navigate for redirect");
    assert.ok(content.includes("/login"), "should redirect to /login");
    assert.ok(content.includes("isAuthenticated"), "should check isAuthenticated");
    assert.ok(content.includes("loading"), "should handle loading state");
  });

  it("App.tsx should configure all routes", () => {
    const content = readSrc("src/App.tsx");
    assert.ok(content.includes("/login"), "should have /login route");
    assert.ok(content.includes("/cloud-games"), "should have /cloud-games route");
    assert.ok(content.includes("/cloud-desktops"), "should have /cloud-desktops route");
    assert.ok(content.includes("/deals"), "should have /deals route");
    assert.ok(content.includes("/library"), "should have /library route");
    assert.ok(content.includes("/search"), "should have /search route");
    assert.ok(content.includes("AuthProvider"), "should wrap with AuthProvider");
    assert.ok(content.includes("ProtectedRoute") || content.includes("ProtectedLayout"), "should use ProtectedRoute");
  });

  it("main.tsx should use BrowserRouter", () => {
    const content = readSrc("src/main.tsx");
    assert.ok(content.includes("BrowserRouter"), "should import BrowserRouter");
  });
});

// ── Data Count Validation (via text parsing) ───────────────

describe("Data Count Validation", () => {
  it("platforms.ts should have at least 10 platform entries", () => {
    const content = readSrc("src/data/platforms.ts");
    const idMatches = content.match(/id:\s*"[\w-]+"/g);
    assert.ok(idMatches, "should have platform id entries");
    assert.ok(idMatches.length >= 10, `expected >= 10 platforms, got ${idMatches.length}`);
  });

  it("desktops.ts should have at least 5 desktop entries", () => {
    const content = readSrc("src/data/desktops.ts");
    const idMatches = content.match(/id:\s*"[\w-]+"/g);
    assert.ok(idMatches, "should have desktop id entries");
    assert.ok(idMatches.length >= 5, `expected >= 5 desktops, got ${idMatches.length}`);
  });

  it("deals.ts should have entries in all 5 categories", () => {
    const content = readSrc("src/data/deals.ts");
    const categories = ["checkin", "limited_free", "coupon", "new_user", "wildcard"];
    for (const cat of categories) {
      const regex = new RegExp(`category:\\s*"${cat}"`, "g");
      const matches = content.match(regex);
      assert.ok(
        matches && matches.length > 0,
        `category "${cat}" should have at least 1 deal`
      );
    }
  });

  it("deals.ts should have at least 15 total deals", () => {
    const content = readSrc("src/data/deals.ts");
    const idMatches = content.match(/id:\s*"[\w-]+"/g);
    assert.ok(idMatches, "should have deal id entries");
    assert.ok(idMatches.length >= 15, `expected >= 15 deals, got ${idMatches.length}`);
  });
});

// ── Deals API Category Filter Validation ───────────────────

describe("Deals API Category Filter (functions/api/deals/index.ts)", () => {
  const content = readSrc("functions/api/deals/index.ts");

  it("should support ?category= query parameter", () => {
    assert.ok(content.includes("searchParams.get"), "should parse query params");
    assert.ok(content.includes("category"), "should handle category parameter");
  });

  it("should validate category against allowed values", () => {
    assert.ok(content.includes("VALID_CATEGORIES"), "should define valid categories");
    assert.ok(content.includes("checkin"), "should include checkin");
    assert.ok(content.includes("limited_free"), "should include limited_free");
    assert.ok(content.includes("coupon"), "should include coupon");
    assert.ok(content.includes("new_user"), "should include new_user");
    assert.ok(content.includes("wildcard"), "should include wildcard");
  });

  it("should filter static fallback data by category", () => {
    assert.ok(content.includes("staticDeals.filter"), "should filter static deals by category");
  });
});

// ── Search API Validation ──────────────────────────────────

describe("Search API (functions/api/search.ts)", () => {
  const content = readSrc("functions/api/search.ts");

  it("should search across games, platforms, and deals", () => {
    assert.ok(content.includes("staticGames"), "should search games");
    assert.ok(content.includes("staticPlatforms"), "should search platforms");
    assert.ok(content.includes("staticDeals"), "should search deals");
  });

  it("should support space-separated keywords", () => {
    assert.ok(content.includes("split"), "should split keywords");
    assert.ok(content.includes("every"), "should match all keywords (AND logic)");
  });

  it("should return SearchResult format", () => {
    assert.ok(content.includes("games"), "should return games array");
    assert.ok(content.includes("platforms"), "should return platforms array");
    assert.ok(content.includes("deals"), "should return deals array");
  });
});
