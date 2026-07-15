/**
 * SQL Schema & Seed Validation Tests
 *
 * Validates:
 * - schema.sql table definitions are syntactically correct
 * - seed.sql INSERT columns match schema column names
 * - All required tables exist in schema
 * - Seed data count matches static data
 *
 * Run with: npx tsx --test tests/sql-validation.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const schemaSql = readFileSync(join(projectRoot, "schema.sql"), "utf-8");
const seedSql = readFileSync(join(projectRoot, "seed.sql"), "utf-8");

// ── Schema Validation ──────────────────────────────────────

describe("schema.sql", () => {
  it("should define users table", () => {
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS users/, "users table should exist");
  });

  it("should define platforms table", () => {
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS platforms/, "platforms table should exist");
  });

  it("should define cloud_desktops table", () => {
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS cloud_desktops/, "cloud_desktops table should exist");
  });

  it("should define deals table", () => {
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS deals/, "deals table should exist");
  });

  it("should define games table", () => {
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS games/, "games table should exist");
  });

  it("should define favorites table", () => {
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS favorites/, "favorites table should exist");
  });

  it("users table should have required columns", () => {
    const usersSection = schemaSql.match(/CREATE TABLE IF NOT EXISTS users\s*\(([\s\S]*?)\)/);
    assert.ok(usersSection, "users table definition not found");
    const columns = usersSection[1];
    assert.match(columns, /id\s+INTEGER PRIMARY KEY/, "users.id should be INTEGER PRIMARY KEY");
    assert.match(columns, /email\s+TEXT\s+UNIQUE NOT NULL/, "users.email should be UNIQUE NOT NULL");
    assert.match(columns, /username\s+TEXT/, "users.username should exist (nullable)");
    assert.match(columns, /password_hash\s+TEXT\s+NOT NULL/, "users.password_hash should be NOT NULL");
    assert.match(columns, /salt\s+TEXT\s+NOT NULL/, "users.salt should be NOT NULL");
    assert.match(columns, /created_at\s+TEXT\s+NOT NULL/, "users.created_at should be NOT NULL");
    assert.match(columns, /updated_at\s+TEXT\s+NOT NULL/, "users.updated_at should be NOT NULL");
    assert.match(columns, /level\s+INTEGER NOT NULL DEFAULT 1/, "users.level should default to 1");
    // is_admin is added via ALTER TABLE in the same migration file
    assert.match(schemaSql, /ALTER TABLE users ADD COLUMN is_admin/, "users.is_admin should be added via ALTER");
  });

  it("platforms table should have required columns", () => {
    const platformsSection = schemaSql.match(/CREATE TABLE IF NOT EXISTS platforms\s*\(([\s\S]*?)\)/);
    assert.ok(platformsSection, "platforms table definition not found");
    const columns = platformsSection[1];
    assert.match(columns, /id\s+TEXT\s+PRIMARY KEY/, "platforms.id should be TEXT PRIMARY KEY");
    assert.match(columns, /name/, "platforms should have name");
    assert.match(columns, /color/, "platforms should have color");
    assert.match(columns, /price/, "platforms should have price");
    assert.match(columns, /free_info/, "platforms should have free_info");
    assert.match(columns, /url/, "platforms should have url");
    assert.match(columns, /description/, "platforms should have description");
    assert.match(columns, /tags/, "platforms should have tags");
    assert.match(columns, /activity/, "platforms should have activity");
    assert.match(columns, /sort_order/, "platforms should have sort_order");
  });

  it("deals table should have category column for filtering", () => {
    const dealsSection = schemaSql.match(/CREATE TABLE IF NOT EXISTS deals\s*\(([\s\S]*?)\)/);
    assert.ok(dealsSection, "deals table definition not found");
    assert.match(dealsSection[1], /category\s+TEXT\s+NOT NULL/, "deals.category should be NOT NULL");
  });

  it("should create indexes", () => {
    assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS idx_deals_category/, "deals category index");
    assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS idx_favorites_user/, "favorites user index");
    assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS idx_users_email/, "users email index");
  });
});

// ── Seed Data Validation ───────────────────────────────────

describe("seed.sql", () => {
  it("should insert into platforms table", () => {
    assert.match(seedSql, /INSERT INTO platforms/, "should have platforms INSERT");
  });

  it("should insert into cloud_desktops table", () => {
    assert.match(seedSql, /INSERT INTO cloud_desktops/, "should have cloud_desktops INSERT");
  });

  it("should insert into deals table", () => {
    assert.match(seedSql, /INSERT INTO deals/, "should have deals INSERT");
  });

  it("platforms INSERT columns should match schema", () => {
    const insertMatch = seedSql.match(/INSERT INTO platforms\s*\(([^)]+)\)/);
    assert.ok(insertMatch, "platforms INSERT not found");
    const insertColumns = insertMatch[1].split(",").map((c) => c.trim());
    const requiredColumns = ["id", "name", "color", "price", "free_info", "url", "description", "tags", "activity", "sort_order"];
    for (const col of requiredColumns) {
      assert.ok(
        insertColumns.includes(col),
        `platforms INSERT should include column: ${col}`
      );
    }
  });

  it("cloud_desktops INSERT columns should match schema", () => {
    const insertMatch = seedSql.match(/INSERT INTO cloud_desktops\s*\(([^)]+)\)/);
    assert.ok(insertMatch, "cloud_desktops INSERT not found");
    const insertColumns = insertMatch[1].split(",").map((c) => c.trim());
    const requiredColumns = ["id", "name", "url", "description", "scenarios", "price_range", "activity", "sort_order"];
    for (const col of requiredColumns) {
      assert.ok(
        insertColumns.includes(col),
        `cloud_desktops INSERT should include column: ${col}`
      );
    }
  });

  it("deals INSERT columns should match schema", () => {
    const insertMatch = seedSql.match(/INSERT INTO deals\s*\(([^)]+)\)/);
    assert.ok(insertMatch, "deals INSERT not found");
    const insertColumns = insertMatch[1].split(",").map((c) => c.trim());
    const requiredColumns = ["id", "title", "description", "link", "category", "tags", "updated_at", "expires_at", "sort_order"];
    for (const col of requiredColumns) {
      assert.ok(
        insertColumns.includes(col),
        `deals INSERT should include column: ${col}`
      );
    }
  });

  it("should insert at least 10 platforms", () => {
    // Count platform entries by counting VALUES tuples
    const platformsInsert = seedSql.match(/INSERT INTO platforms[\s\S]*?;/);
    assert.ok(platformsInsert, "platforms INSERT not found");
    // Count the number of value tuples (lines starting with ( in the VALUES section)
    const valueLines = platformsInsert[0].split("\n").filter((l) => l.trim().startsWith("("));
    assert.ok(valueLines.length >= 10, `expected >= 10 platform entries, got ${valueLines.length}`);
  });

  it("should insert at least 5 desktops", () => {
    const desktopsInsert = seedSql.match(/INSERT INTO cloud_desktops[\s\S]*?;/);
    assert.ok(desktopsInsert, "cloud_desktops INSERT not found");
    const valueLines = desktopsInsert[0].split("\n").filter((l) => l.trim().startsWith("("));
    assert.ok(valueLines.length >= 5, `expected >= 5 desktop entries, got ${valueLines.length}`);
  });

  it("should insert deals in all 5 categories", () => {
    const dealsInsert = seedSql.match(/INSERT INTO deals[\s\S]*?;/);
    assert.ok(dealsInsert, "deals INSERT not found");
    const categories = ["checkin", "limited_free", "coupon", "new_user", "wildcard"];
    for (const cat of categories) {
      assert.ok(
        dealsInsert[0].includes(`'${cat}'`),
        `deals seed should include category: ${cat}`
      );
    }
  });
});
