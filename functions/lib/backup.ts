/**
 * D1 Database Backup Script
 *
 * Uses Cloudflare's D1 export API to create a backup of the database.
 * Designed to be run via Cron Triggers (scheduled) or manually.
 *
 * Usage in wrangler.toml:
 *   [triggers]
 *   crons = ["0 2 * * *"]  # Daily at 2 AM UTC
 *
 * Or run manually: wrangler d1 export cloudgame-hub-db --output backup.sql
 */

/**
 * Scheduled handler for D1 backup.
 * This runs when triggered by Cron Triggers.
 *
 * @param event  - Scheduled event
 * @param env    - Environment bindings
 * @param ctx    - Execution context
 */
export async function onRequestScheduled(
  event: ScheduledEvent,
  env: { DB: D1Database; BACKUP_BUCKET?: R2Bucket },
  ctx: ExecutionContext
): Promise<void> {
  console.log(JSON.stringify({
    level: "info",
    message: "d1_backup_started",
    timestamp: new Date().toISOString(),
  }));

  try {
    // Export D1 database to SQL dump
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%'"
    ).all<{ name: string }>();

    let dump = `-- D1 Backup: ${new Date().toISOString()}\n\n`;

    for (const table of results) {
      const tableName = table.name;
      // Get schema
      const schema = await env.DB.prepare(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
      ).bind(tableName).first<{ sql: string }>();

      if (schema?.sql) {
        dump += `-- Table: ${tableName}\n${schema.sql};\n\n`;
      }

      // Get data
      const data = await env.DB.prepare(`SELECT * FROM ${tableName}`).all();
      for (const row of data.results) {
        const values = Object.values(row).map(v => {
          if (v === null) return "NULL";
          if (typeof v === "number") return String(v);
          if (typeof v === "boolean") return v ? "1" : "0";
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        const columns = Object.keys(row).join(", ");
        dump += `INSERT INTO ${tableName} (${columns}) VALUES (${values.join(", ")});\n`;
      }
      dump += "\n";
    }

    // Store backup in R2 if configured
    if (env.BACKUP_BUCKET) {
      const backupKey = `backups/d1-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
      await env.BACKUP_BUCKET.put(backupKey, dump);

      // Clean up backups older than 30 days
      const list = await env.BACKUP_BUCKET.list({ prefix: "backups/" });
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      for (const obj of list.objects) {
        if (obj.uploaded.getTime() < cutoff) {
          await env.BACKUP_BUCKET.delete(obj.key);
        }
      }

      console.log(JSON.stringify({
        level: "info",
        message: "d1_backup_completed",
        timestamp: new Date().toISOString(),
        backupKey,
        sizeBytes: dump.length,
      }));
    } else {
      console.log(JSON.stringify({
        level: "warn",
        message: "d1_backup_no_r2",
        timestamp: new Date().toISOString(),
        note: "BACKUP_BUCKET not configured, backup not persisted",
      }));
    }
  } catch (err) {
    console.log(JSON.stringify({
      level: "error",
      message: "d1_backup_failed",
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    }));
  }
}
