#!/usr/bin/env node

/**
 * D1 Database Backup Script
 *
 * Exports the cloudgame-hub D1 database to a local SQL file.
 * Run manually: node scripts/backup-d1.js
 * Or via npm: npm run db:backup
 *
 * Recommended: Set up as a daily cron job / scheduled task.
 *
 * Requirements:
 * - wrangler installed and authenticated
 * - CLOUDFLARE_ACCOUNT_ID environment variable set
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";

const DB_NAME = "cloudgame-hub-db";
const BACKUP_DIR = resolve(process.cwd(), "backups");

// Ensure backup directory exists
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate timestamped filename
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupFile = join(BACKUP_DIR, `backup-${timestamp}.sql`);

console.log(`[backup] Starting D1 export for "${DB_NAME}"...`);
console.log(`[backup] Output: ${backupFile}`);

try {
  // Export D1 database to SQL file
  const cmd = `wrangler d1 export ${DB_NAME} --remote --output="${backupFile}"`;
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env },
  });

  // Check file was created
  if (!existsSync(backupFile)) {
    throw new Error("Backup file was not created");
  }

  const stats = require("fs").statSync(backupFile);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log(`[backup] Success! File size: ${sizeKB} KB`);
  console.log(`[backup] File: ${backupFile}`);

  // Clean up old backups (keep last 30 days)
  const { readdirSync, unlinkSync } = require("fs");
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-") && f.endsWith(".sql"))
    .sort();

  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const file of files) {
    const filePath = join(BACKUP_DIR, file);
    const fileStats = require("fs").statSync(filePath);
    if (fileStats.mtimeMs < thirtyDaysAgo) {
      unlinkSync(filePath);
      deleted++;
    }
  }

  if (deleted > 0) {
    console.log(`[backup] Cleaned up ${deleted} backup(s) older than 30 days`);
  }

  console.log(`[backup] Total backups: ${files.length - deleted}`);
} catch (err) {
  console.error(`[backup] FAILED:`, err.message);
  process.exit(1);
}
