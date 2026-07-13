/**
 * Generate seed-games.sql from src/data/games.ts
 * Usage: node gen-seed-games.cjs
 * Output: migrations/seed-games.sql
 */
const fs = require("fs");
const path = require("path");

function loadTsData(filePath, varName) {
  const raw = fs.readFileSync(filePath, "utf-8");
  // Strip TS import lines
  let code = raw.replace(/^import\s+.*$/gm, "");
  // Strip type annotations after colon (e.g. `: Game[]`, `: string`, `: PlatformId[]`)
  code = code.replace(/:\s*[A-Za-z_][A-Za-z0-9_|]*(\[\])?\s*(?==)/g, " ");
  // Strip `export ` keyword
  code = code.replace(/export\s+/g, "");
  // Strip `as const`
  code = code.replace(/\s+as\s+const/g, "");
  // Append export so we can retrieve the variable
  code += `\nmodule.exports = { ${varName} };`;

  // Use vm to evaluate
  const vm = require("vm");
  const sandbox = { module: { exports: {} }, exports: {}, require, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const data = sandbox.module?.exports?.[varName];
  if (!data) throw new Error(`Variable ${varName} not found in ${filePath}`);
  return data;
}

function sqlEscape(s) {
  if (s == null) return "";
  return String(s).replace(/'/g, "''");
}

const games = loadTsData(
  path.join(__dirname, "src/data/games.ts"),
  "games"
);

console.log(`Loaded ${games.length} games`);

let sql = "-- ═══════════════════════════════════════════════════════════\n";
sql += "-- P1-4: games 种子数据\n";
sql += `-- 共 ${games.length} 条游戏数据，从 src/data/games.ts 生成\n`;
sql += "-- ═══════════════════════════════════════════════════════════\n\n";
sql += "DELETE FROM games;\n\n";

for (let i = 0; i < games.length; i++) {
  const g = games[i];
  sql += `INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (\n`;
  sql += `  '${sqlEscape(g.id)}',\n`;
  sql += `  '${sqlEscape(g.name)}',\n`;
  sql += `  '${sqlEscape(g.type)}',\n`;
  sql += `  ${g.rating},\n`;
  sql += `  '${sqlEscape(g.config)}',\n`;
  sql += `  '${JSON.stringify(g.platforms || [])}',\n`;
  sql += `  '${sqlEscape(g.desc || "")}',\n`;
  sql += `  '${sqlEscape(g.reason || "")}',\n`;
  sql += `  '${JSON.stringify(g.tags || [])}',\n`;
  sql += `  '${sqlEscape(g.emoji || "")}',\n`;
  sql += `  ${g.cover ? `'${sqlEscape(g.cover)}'` : "NULL"},\n`;
  sql += `  ${i},\n`;
  sql += `  1\n);\n`;
}

fs.writeFileSync(
  path.join(__dirname, "migrations/seed-games.sql"),
  sql,
  "utf-8"
);
console.log(`Written migrations/seed-games.sql (${games.length} rows)`);
