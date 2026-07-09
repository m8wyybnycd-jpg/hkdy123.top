/**
 * Auth Module Tests — functions/lib/auth.ts
 *
 * Tests PBKDF2 password hashing/verification and JWT sign/verify.
 * Uses Node.js built-in test runner (node:test).
 *
 * Run with: npx tsx --test tests/auth.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, signJWT, verifyJWT } from "../functions/lib/auth";

const TEST_SECRET = "test_secret_at_least_32_characters_long!!";

// ── hashPassword Tests ─────────────────────────────────────

describe("hashPassword", () => {
  it("should return an object with hash and salt properties", async () => {
    const result = await hashPassword("mypassword123");
    assert.ok(result.hash, "hash should be defined");
    assert.ok(result.salt, "salt should be defined");
    assert.equal(typeof result.hash, "string", "hash should be a string");
    assert.equal(typeof result.salt, "string", "salt should be a string");
  });

  it("should return base64-encoded hash and salt", async () => {
    const result = await hashPassword("test123456");
    // Base64 characters: A-Z, a-z, 0-9, +, /, =
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    assert.match(result.hash, base64Regex, "hash should be base64-encoded");
    assert.match(result.salt, base64Regex, "salt should be base64-encoded");
  });

  it("should generate different salts for the same password", async () => {
    const result1 = await hashPassword("samepassword");
    const result2 = await hashPassword("samepassword");
    assert.notEqual(result1.salt, result2.salt, "salts should be different");
    assert.notEqual(result1.hash, result2.hash, "hashes should be different (different salt)");
  });
});

// ── verifyPassword Tests ───────────────────────────────────

describe("verifyPassword", () => {
  it("should return true for correct password", async () => {
    const password = "correctPassword123";
    const { hash, salt } = await hashPassword(password);
    const isValid = await verifyPassword(password, hash, salt);
    assert.equal(isValid, true, "correct password should verify");
  });

  it("should return false for wrong password", async () => {
    const { hash, salt } = await hashPassword("correctPassword123");
    const isValid = await verifyPassword("wrongPassword456", hash, salt);
    assert.equal(isValid, false, "wrong password should not verify");
  });

  it("should return false for empty password", async () => {
    const { hash, salt } = await hashPassword("realpassword");
    const isValid = await verifyPassword("", hash, salt);
    assert.equal(isValid, false, "empty password should not verify");
  });

  it("should return false for invalid salt format", async () => {
    const isValid = await verifyPassword("password", "invalidhash", "invalidsalt!!!");
    assert.equal(isValid, false, "invalid salt should return false");
  });
});

// ── signJWT Tests ──────────────────────────────────────────

describe("signJWT", () => {
  it("should return a non-empty JWT string", async () => {
    const token = await signJWT({ userId: 1, username: "testuser" }, TEST_SECRET);
    assert.ok(token, "token should be non-empty");
    assert.equal(typeof token, "string", "token should be a string");
  });

  it("should produce a token with three parts separated by dots", async () => {
    const token = await signJWT({ userId: 1, username: "testuser" }, TEST_SECRET);
    const parts = token.split(".");
    assert.equal(parts.length, 3, "JWT should have header.payload.signature");
  });

  it("should use HS256 algorithm in the header", async () => {
    const token = await signJWT({ userId: 1, username: "testuser" }, TEST_SECRET);
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64").toString());
    assert.equal(header.alg, "HS256", "algorithm should be HS256");
  });

  it("should include userId and username in the payload", async () => {
    const token = await signJWT({ userId: 42, username: "alice" }, TEST_SECRET);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    assert.equal(payload.userId, 42, "payload should contain userId");
    assert.equal(payload.username, "alice", "payload should contain username");
  });

  it("should include exp (expiration) and iat (issued at) claims", async () => {
    const token = await signJWT({ userId: 1, username: "testuser" }, TEST_SECRET);
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    assert.ok(payload.exp, "payload should have exp claim");
    assert.ok(payload.iat, "payload should have iat claim");
    // Expiration should be 7 days from now (604800 seconds)
    const expectedExp = payload.iat + 604800;
    assert.equal(payload.exp, expectedExp, "exp should be 7 days (604800s) after iat");
  });
});

// ── verifyJWT Tests ────────────────────────────────────────

describe("verifyJWT", () => {
  it("should verify a valid token and return the payload", async () => {
    const token = await signJWT({ userId: 99, username: "verifyuser" }, TEST_SECRET);
    const payload = await verifyJWT(token, TEST_SECRET);
    assert.equal(payload.userId, 99, "userId should match");
    assert.equal(payload.username, "verifyuser", "username should match");
  });

  it("should throw for a token signed with a different secret", async () => {
    const token = await signJWT({ userId: 1, username: "testuser" }, TEST_SECRET);
    await assert.rejects(
      verifyJWT(token, "wrong_secret"),
      "should reject token with wrong secret"
    );
  });

  it("should throw for a malformed token", async () => {
    await assert.rejects(
      verifyJWT("not.a.valid.jwt", TEST_SECRET),
      "should reject malformed token"
    );
  });

  it("should throw for an empty token", async () => {
    await assert.rejects(
      verifyJWT("", TEST_SECRET),
      "should reject empty token"
    );
  });
});
