import { jsonResponse, serverError } from "../lib/response";

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and uptime checks.
 * Returns service status and D1 database connectivity.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const startTime = Date.now();
  const { DB } = context.env;

  // Check D1 connectivity
  let dbStatus: "ok" | "error" = "ok";
  let dbLatency = 0;

  if (DB) {
    try {
      const dbStart = Date.now();
      await DB.prepare("SELECT 1 as test").first();
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = "error";
    }
  } else {
    dbStatus = "error";
  }

  const responseTime = Date.now() - startTime;

  if (dbStatus === "error") {
    return serverError("Database unavailable");
  }

  return jsonResponse(
    {
      status: "ok",
      uptime: process.uptime ? Math.floor(process.uptime()) : null,
      responseTimeMs: responseTime,
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      timestamp: new Date().toISOString(),
    },
    "Service healthy"
  );
};
