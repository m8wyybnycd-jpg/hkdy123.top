// Reads src/data/freeGames.ts and src/data/smsPlatforms.ts, strips TS syntax,
// evals the arrays, and emits migrations/seed-content.sql with INSERTs.
const fs = require("fs");
const path = require("path");

function loadTsData(relPath, names) {
  let src = fs.readFileSync(path.join(__dirname, relPath), "utf8");
  // Remove interface declarations
  src = src.replace(/export\s+interface[\s\S]*?\n\}/g, "");
  // Strip type annotations on const declarations: `export const X: Type[] =` -> `const X =`
  src = src.replace(/export\s+const\s+(\w+)\s*:\s*[A-Za-z<>\[\],\s]+\s*=/g, "const $1 =");
  src = src.replace(/export\s+/g, "");
  const m = { exports: {} };
  const exportLine = "module.exports = { " + names.join(", ") + " };";
  const fn = new Function("module", "exports", src + "\n" + exportLine);
  fn(m, m.exports);
  return m.exports;
}

const d1 = loadTsData("src/data/freeGames.ts", ["freeGames"]);
const d2 = loadTsData("src/data/smsPlatforms.ts", ["smsPlatforms"]);
const fg = d1.freeGames;
const sms = d2.smsPlatforms;

function esc(s) {
  return String(s).replace(/'/g, "''");
}

let out = `-- ============================================\n`;
out += `-- Seed: free_games (26) + sms_platforms (24)\n`;
out += `-- Plus permission codes for free_game / sms_platform modules\n`;
out += `-- ============================================\n\n`;

out += `DELETE FROM free_games;\n`;
out += `DELETE FROM sms_platforms;\n\n`;

out += `-- ── free_games (${fg.length} entries) ─────────────────────\n\n`;
out += `INSERT INTO free_games (id, name, type, platform, description, quark_link, emoji, sort_order) VALUES\n`;
out += fg
  .map(
    (g, i) =>
      `('${esc(g.id)}', '${esc(g.name)}', '${esc(g.type)}', '${esc(g.platform)}', '${esc(
        g.description
      )}', '${esc(g.quarkLink)}', '${esc(g.emoji)}', ${i + 1})`
  )
  .join(",\n") + ";\n\n";

out += `-- ── sms_platforms (${sms.length} entries) ────────────────\n\n`;
out += `INSERT INTO sms_platforms (id, name, url, category, countries, is_free, need_register, support_chinese, retention, description, features, sort_order) VALUES\n`;
out += sms
  .map((p, i) => {
    const isFree = p.isFree ? 1 : 0;
    const needReg = p.needRegister ? 1 : 0;
    const cn = p.supportChinese ? 1 : 0;
    const features = JSON.stringify(p.features).replace(/'/g, "''");
    return `('${esc(p.id)}', '${esc(p.name)}', '${esc(p.url)}', '${esc(p.category)}', '${esc(
      p.countries
    )}', ${isFree}, ${needReg}, ${cn}, '${esc(p.retention)}', '${esc(p.description)}', '${features}', ${
      i + 1
    })`;
  })
  .join(",\n") + ";\n\n";

out += `-- ── Permission codes: free_game + sms_platform ──\n`;
out += `-- Determine next id to avoid clashes\n`;
out += `INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)\n`;
out += `SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 1, 'free_game:view', '查看免费资源', 'free_game', 'view', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 1\n`;
out += `WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'free_game:view');\n`;
out += `INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)\n`;
out += `SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 2, 'free_game:manage', '管理免费资源', 'free_game', 'manage', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 2\n`;
out += `WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'free_game:manage');\n`;
out += `INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)\n`;
out += `SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 3, 'sms_platform:view', '查看接码平台', 'sms_platform', 'view', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 3\n`;
out += `WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sms_platform:view');\n`;
out += `INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)\n`;
out += `SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 4, 'sms_platform:manage', '管理接码平台', 'sms_platform', 'manage', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 4\n`;
out += `WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sms_platform:manage');\n\n`;

out += `-- ── Grant all four to super_admin ──\n`;
out += `INSERT OR IGNORE INTO role_permissions (role_id, permission_id)\n`;
out += `  SELECT r.id, p.id FROM roles r, permissions p\n`;
out += `  WHERE r.code = 'super_admin' AND p.code IN ('free_game:view', 'free_game:manage', 'sms_platform:view', 'sms_platform:manage');\n`;

fs.writeFileSync(path.join(__dirname, "migrations/seed-content.sql"), out, "utf8");
console.log("WROTE migrations/seed-content.sql");
console.log("free_games:", fg.length, "sms_platforms:", sms.length);
