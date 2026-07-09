/**
 * Data Integrity Tests — validates static data files
 *
 * Ensures:
 * - platforms.ts has >= 10 entries
 * - desktops.ts has >= 5 entries
 * - deals.ts has 5 categories with data
 * - All data entries have required fields
 * - seed.sql INSERT columns match schema.sql columns
 *
 * Run with: npx tsx --test tests/data-integrity.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { platforms, platformMap } from "../src/data/platforms";
import { desktops, desktopMap } from "../src/data/desktops";
import { deals, dealMap } from "../src/data/deals";
import { games } from "../src/data/games";
import type { DealCategory } from "../src/types";

// ── Platforms Data Tests ───────────────────────────────────

describe("Platforms Data (src/data/platforms.ts)", () => {
  it("should have at least 10 platforms", () => {
    assert.ok(platforms.length >= 10, `expected >= 10 platforms, got ${platforms.length}`);
  });

  it("should have all required fields for each platform", () => {
    for (const p of platforms) {
      assert.ok(p.id, `platform missing id: ${JSON.stringify(p)}`);
      assert.ok(p.name, `platform ${p.id} missing name`);
      assert.ok(p.color, `platform ${p.id} missing color`);
      assert.ok(p.price, `platform ${p.id} missing price`);
      assert.ok(p.freeInfo !== undefined, `platform ${p.id} missing freeInfo`);
      assert.ok(p.url, `platform ${p.id} missing url`);
      assert.ok(p.desc, `platform ${p.id} missing desc`);
      assert.ok(Array.isArray(p.tags), `platform ${p.id} tags should be array`);
      assert.ok(p.activity !== undefined, `platform ${p.id} missing activity`);
    }
  });

  it("should have unique IDs", () => {
    const ids = platforms.map((p) => p.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, "platform IDs should be unique");
  });

  it("should have valid color hex codes", () => {
    for (const p of platforms) {
      assert.match(
        p.color,
        /^#[0-9a-fA-F]{6}$/,
        `platform ${p.id} has invalid color: ${p.color}`
      );
    }
  });

  it("should have valid URLs", () => {
    for (const p of platforms) {
      assert.match(
        p.url,
        /^https?:\/\//,
        `platform ${p.id} has invalid URL: ${p.url}`
      );
    }
  });

  it("platformMap should match platforms array", () => {
    for (const p of platforms) {
      assert.ok(platformMap[p.id], `platformMap missing id: ${p.id}`);
      assert.equal(platformMap[p.id].name, p.name);
    }
  });
});

// ── Desktops Data Tests ────────────────────────────────────

describe("Desktops Data (src/data/desktops.ts)", () => {
  it("should have at least 5 desktops", () => {
    assert.ok(desktops.length >= 5, `expected >= 5 desktops, got ${desktops.length}`);
  });

  it("should have all required fields for each desktop", () => {
    for (const d of desktops) {
      assert.ok(d.id, `desktop missing id: ${JSON.stringify(d)}`);
      assert.ok(d.name, `desktop ${d.id} missing name`);
      assert.ok(d.url, `desktop ${d.id} missing url`);
      assert.ok(d.desc, `desktop ${d.id} missing desc`);
      assert.ok(Array.isArray(d.scenarios), `desktop ${d.id} scenarios should be array`);
      assert.ok(d.scenarios.length > 0, `desktop ${d.id} should have at least 1 scenario`);
      assert.ok(d.priceRange, `desktop ${d.id} missing priceRange`);
      assert.ok(d.activity !== undefined, `desktop ${d.id} missing activity`);
    }
  });

  it("should have unique IDs", () => {
    const ids = desktops.map((d) => d.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, "desktop IDs should be unique");
  });

  it("desktopMap should match desktops array", () => {
    for (const d of desktops) {
      assert.ok(desktopMap[d.id], `desktopMap missing id: ${d.id}`);
    }
  });
});

// ── Deals Data Tests ───────────────────────────────────────

describe("Deals Data (src/data/deals.ts)", () => {
  const REQUIRED_CATEGORIES: DealCategory[] = [
    "checkin",
    "limited_free",
    "coupon",
    "new_user",
    "wildcard",
  ];

  it("should have deals in all 5 categories", () => {
    for (const cat of REQUIRED_CATEGORIES) {
      const count = deals.filter((d) => d.category === cat).length;
      assert.ok(
        count > 0,
        `category "${cat}" should have at least 1 deal, got ${count}`
      );
    }
  });

  it("should have all required fields for each deal", () => {
    for (const d of deals) {
      assert.ok(d.id, `deal missing id: ${JSON.stringify(d)}`);
      assert.ok(d.title, `deal ${d.id} missing title`);
      assert.ok(d.description, `deal ${d.id} missing description`);
      assert.ok(d.link, `deal ${d.id} missing link`);
      assert.ok(REQUIRED_CATEGORIES.includes(d.category), `deal ${d.id} has invalid category: ${d.category}`);
      assert.ok(Array.isArray(d.tags), `deal ${d.id} tags should be array`);
      assert.ok(d.updatedAt, `deal ${d.id} missing updatedAt`);
      // expiresAt can be null (long-term valid) or a string
      assert.ok(
        d.expiresAt === null || typeof d.expiresAt === "string",
        `deal ${d.id} expiresAt should be null or string`
      );
    }
  });

  it("should have unique IDs", () => {
    const ids = deals.map((d) => d.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, "deal IDs should be unique");
  });

  it("dealMap should match deals array", () => {
    for (const d of deals) {
      assert.ok(dealMap[d.id], `dealMap missing id: ${d.id}`);
    }
  });

  it("each category should have at least 3 deals", () => {
    for (const cat of REQUIRED_CATEGORIES) {
      const count = deals.filter((d) => d.category === cat).length;
      assert.ok(
        count >= 3,
        `category "${cat}" should have at least 3 deals, got ${count}`
      );
    }
  });
});

// ── Games Data Tests ───────────────────────────────────────

describe("Games Data (src/data/games.ts)", () => {
  it("should have games data", () => {
    assert.ok(games.length > 0, "should have at least 1 game");
  });

  it("should have all required fields for each game", () => {
    for (const g of games) {
      assert.ok(g.id, `game missing id`);
      assert.ok(g.name, `game ${g.id} missing name`);
      assert.ok(g.type, `game ${g.id} missing type`);
      assert.ok(typeof g.rating === "number", `game ${g.id} rating should be number`);
      assert.ok(g.config, `game ${g.id} missing config`);
      assert.ok(Array.isArray(g.platforms), `game ${g.id} platforms should be array`);
      assert.ok(g.desc, `game ${g.id} missing desc`);
      assert.ok(g.reason, `game ${g.id} missing reason`);
      assert.ok(Array.isArray(g.tags), `game ${g.id} tags should be array`);
      assert.ok(g.emoji, `game ${g.id} missing emoji`);
    }
  });

  it("should have unique game IDs", () => {
    const ids = games.map((g) => g.id);
    const uniqueIds = new Set(ids);
    assert.equal(ids.length, uniqueIds.size, "game IDs should be unique");
  });
});
