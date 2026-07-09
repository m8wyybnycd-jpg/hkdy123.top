/**
 * Response Utility Tests — functions/lib/response.ts
 *
 * Tests jsonResponse, errorResponse, and all error helper functions.
 *
 * Run with: npx tsx --test tests/response.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  jsonResponse,
  errorResponse,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  serverError,
  requireAuth,
} from "../functions/lib/response";

// ── jsonResponse Tests ─────────────────────────────────────

describe("jsonResponse", () => {
  it("should return a Response object", () => {
    const res = jsonResponse({ key: "value" });
    assert.ok(res instanceof Response, "should return a Response instance");
  });

  it("should have Content-Type: application/json header", () => {
    const res = jsonResponse({});
    assert.equal(
      res.headers.get("Content-Type"),
      "application/json",
      "should have JSON content type"
    );
  });

  it("should return code 0 and correct data for success", async () => {
    const data = { name: "test", value: 42 };
    const res = jsonResponse(data);
    const body = await res.json();
    assert.deepEqual(body, { code: 0, data, message: "success" });
  });

  it("should accept custom message", async () => {
    const res = jsonResponse(null, "操作成功");
    const body = await res.json();
    assert.equal(body.message, "操作成功");
  });

  it("should default to HTTP 200 status", () => {
    const res = jsonResponse({});
    assert.equal(res.status, 200);
  });

  it("should accept custom HTTP status", () => {
    const res = jsonResponse({}, "success", 0, 201);
    assert.equal(res.status, 201);
  });
});

// ── errorResponse Tests ────────────────────────────────────

describe("errorResponse", () => {
  it("should return null data for error responses", async () => {
    const res = errorResponse(400, "Bad Request");
    const body = await res.json();
    assert.equal(body.data, null, "data should be null for errors");
    assert.equal(body.code, 400, "code should match error code");
    assert.equal(body.message, "Bad Request");
  });

  it("should default to HTTP 400 status", () => {
    const res = errorResponse(500, "Server Error");
    assert.equal(res.status, 400, "should default to 400");
  });

  it("should accept custom HTTP status", () => {
    const res = errorResponse(401, "Unauthorized", 401);
    assert.equal(res.status, 401);
  });
});

// ── Error Helper Functions ────────────────────────────────

describe("badRequest", () => {
  it("should return code 400 and HTTP 400", async () => {
    const res = badRequest("参数错误");
    const body = await res.json();
    assert.equal(body.code, 400);
    assert.equal(res.status, 400);
    assert.equal(body.message, "参数错误");
  });
});

describe("unauthorized", () => {
  it("should return code 401 and HTTP 401 with default message", async () => {
    const res = unauthorized();
    const body = await res.json();
    assert.equal(body.code, 401);
    assert.equal(res.status, 401);
    assert.equal(body.message, "未授权");
  });

  it("should accept custom message", async () => {
    const res = unauthorized("请先登录");
    const body = await res.json();
    assert.equal(body.message, "请先登录");
  });
});

describe("notFound", () => {
  it("should return code 404 and HTTP 404", async () => {
    const res = notFound("资源不存在");
    const body = await res.json();
    assert.equal(body.code, 404);
    assert.equal(res.status, 404);
  });
});

describe("conflict", () => {
  it("should return code 409 and HTTP 409", async () => {
    const res = conflict("用户名已被注册");
    const body = await res.json();
    assert.equal(body.code, 409);
    assert.equal(res.status, 409);
    assert.equal(body.message, "用户名已被注册");
  });
});

describe("serverError", () => {
  it("should return code 500 and HTTP 500", async () => {
    const res = serverError("数据库错误");
    const body = await res.json();
    assert.equal(body.code, 500);
    assert.equal(res.status, 500);
  });

  it("should have default message", async () => {
    const res = serverError();
    const body = await res.json();
    assert.equal(body.message, "服务器内部错误");
  });
});

// ── requireAuth Tests ──────────────────────────────────────

describe("requireAuth", () => {
  it("should return user object when data.user exists", () => {
    const data = { user: { userId: 1, username: "testuser" } };
    const user = requireAuth(data);
    assert.deepEqual(user, { userId: 1, username: "testuser" });
  });

  it("should return null when data.user is undefined", () => {
    const data = {};
    const user = requireAuth(data);
    assert.equal(user, null);
  });
});
