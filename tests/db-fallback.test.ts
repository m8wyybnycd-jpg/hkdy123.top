/**
 * DB Fallback Logic Tests — functions/lib/db.ts
 *
 * Tests queryWithFallback, queryOneWithFallback, executeStatement,
 * and parseJsonArray to verify correct fallback behavior.
 *
 * Run with: npx tsx --test tests/db-fallback.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  queryWithFallback,
  queryOneWithFallback,
  executeStatement,
  parseJsonArray,
} from "../functions/lib/db";

// ── Mock D1 Database ───────────────────────────────────────

function createMockDB(behavior: {
  results?: any[];
  firstResult?: any | null;
  shouldFail?: boolean;
}) {
  return {
    prepare(sql: string) {
      let boundParams: unknown[] = [];
      const stmt = {
        bind(...params: unknown[]) {
          boundParams = params;
          return stmt;
        },
        async all() {
          if (behavior.shouldFail) {
            throw new Error("D1 connection failed");
          }
          return { results: behavior.results || [], success: true, meta: {} };
        },
        async first() {
          if (behavior.shouldFail) {
            throw new Error("D1 connection failed");
          }
          return behavior.firstResult ?? null;
        },
        async run() {
          if (behavior.shouldFail) {
            throw new Error("D1 connection failed");
          }
          return { success: true, meta: {} };
        },
      };
      return stmt;
    },
  };
}

// ── queryWithFallback Tests ────────────────────────────────

describe("queryWithFallback", () => {
  it("should return D1 results when available", async () => {
    const mockResults = [
      { id: "p1", name: "Platform 1" },
      { id: "p2", name: "Platform 2" },
    ];
    const db = createMockDB({ results: mockResults });
    const fallback = [{ id: "fallback", name: "Fallback" }];

    const result = await queryWithFallback(
      db as any,
      "SELECT * FROM platforms",
      [],
      fallback
    );

    assert.equal(result.length, 2, "should return D1 results");
    assert.equal(result[0].id, "p1");
  });

  it("should return fallback when D1 returns empty results", async () => {
    const db = createMockDB({ results: [] });
    const fallback = [{ id: "fallback", name: "Fallback" }];

    const result = await queryWithFallback(
      db as any,
      "SELECT * FROM platforms",
      [],
      fallback
    );

    assert.equal(result.length, 1, "should return fallback for empty D1");
    assert.equal(result[0].id, "fallback");
  });

  it("should return fallback when D1 throws an error", async () => {
    const db = createMockDB({ shouldFail: true });
    const fallback = [{ id: "fallback", name: "Fallback" }];

    const result = await queryWithFallback(
      db as any,
      "SELECT * FROM platforms",
      [],
      fallback
    );

    assert.equal(result.length, 1, "should return fallback on D1 error");
    assert.equal(result[0].id, "fallback");
  });

  it("should return fallback when db is undefined", async () => {
    const fallback = [{ id: "fallback", name: "Fallback" }];

    const result = await queryWithFallback(
      undefined,
      "SELECT * FROM platforms",
      [],
      fallback
    );

    assert.equal(result.length, 1, "should return fallback when db is undefined");
    assert.equal(result[0].id, "fallback");
  });

  it("should apply mapper function when provided", async () => {
    const mockResults = [{ id: "p1", free_info: "free tier", description: "desc" }];
    const db = createMockDB({ results: mockResults });
    const fallback: any[] = [];

    const result = await queryWithFallback(
      db as any,
      "SELECT * FROM platforms",
      [],
      fallback,
      (row) => ({
        id: row.id as string,
        freeInfo: row.free_info as string,
        desc: row.description as string,
      })
    );

    assert.equal(result[0].freeInfo, "free tier", "mapper should convert snake_case to camelCase");
    assert.equal(result[0].desc, "desc");
  });
});

// ── queryOneWithFallback Tests ─────────────────────────────

describe("queryOneWithFallback", () => {
  it("should return D1 result when found", async () => {
    const db = createMockDB({ firstResult: { id: "p1", name: "Platform 1" } });

    const result = await queryOneWithFallback(
      db as any,
      "SELECT * FROM platforms WHERE id = ?",
      ["p1"],
      null
    );

    assert.ok(result, "should return D1 result");
    assert.equal(result!.id, "p1");
  });

  it("should return fallback when D1 returns null", async () => {
    const db = createMockDB({ firstResult: null });
    const fallback = { id: "fallback", name: "Fallback" };

    const result = await queryOneWithFallback(
      db as any,
      "SELECT * FROM platforms WHERE id = ?",
      ["nonexistent"],
      fallback
    );

    assert.equal(result, fallback, "should return fallback when D1 returns null");
  });

  it("should return fallback when D1 throws", async () => {
    const db = createMockDB({ shouldFail: true });
    const fallback = { id: "fallback", name: "Fallback" };

    const result = await queryOneWithFallback(
      db as any,
      "SELECT * FROM platforms WHERE id = ?",
      ["p1"],
      fallback
    );

    assert.equal(result, fallback, "should return fallback on D1 error");
  });

  it("should return fallback when db is undefined", async () => {
    const result = await queryOneWithFallback(
      undefined,
      "SELECT * FROM platforms WHERE id = ?",
      ["p1"],
      null
    );

    assert.equal(result, null, "should return null fallback when db is undefined");
  });
});

// ── executeStatement Tests ─────────────────────────────────

describe("executeStatement", () => {
  it("should return true on successful execution", async () => {
    const db = createMockDB({});
    const result = await executeStatement(
      db as any,
      "INSERT INTO users (username) VALUES (?)",
      ["testuser"]
    );
    assert.equal(result, true, "should return true on success");
  });

  it("should return false when D1 throws", async () => {
    const db = createMockDB({ shouldFail: true });
    const result = await executeStatement(
      db as any,
      "INSERT INTO users (username) VALUES (?)",
      ["testuser"]
    );
    assert.equal(result, false, "should return false on error");
  });

  it("should return false when db is undefined", async () => {
    const result = await executeStatement(
      undefined,
      "INSERT INTO users (username) VALUES (?)",
      ["testuser"]
    );
    assert.equal(result, false, "should return false when db is undefined");
  });
});

// ── parseJsonArray Tests ───────────────────────────────────

describe("parseJsonArray", () => {
  it("should parse valid JSON array string", () => {
    const result = parseJsonArray('["tag1", "tag2", "tag3"]');
    assert.deepEqual(result, ["tag1", "tag2", "tag3"]);
  });

  it("should return empty array for empty JSON array", () => {
    const result = parseJsonArray("[]");
    assert.deepEqual(result, []);
  });

  it("should return empty array for invalid JSON", () => {
    const result = parseJsonArray("not valid json");
    assert.deepEqual(result, [], "invalid JSON should return empty array");
  });

  it("should return empty array for non-string input", () => {
    const result = parseJsonArray(undefined);
    assert.deepEqual(result, [], "undefined should return empty array");
  });

  it("should return empty array for non-array JSON", () => {
    const result = parseJsonArray('{"key": "value"}');
    assert.deepEqual(result, [], "non-array JSON should return empty array");
  });

  it("should handle empty string", () => {
    const result = parseJsonArray("");
    assert.deepEqual(result, [], "empty string should return empty array");
  });
});
