import * as Sentry from "@sentry/react";

/**
 * Sentry initialization.
 *
 * The DSN is public by design — it only sends data TO Sentry,
 * it does not authenticate or grant access to your account.
 */
const SENTRY_DSN =
  "https://26c060ccdaf1b232f798b17ea1cf7540@o4511707518730240.ingest.us.sentry.io/4511707549138944";

const isProduction = import.meta.env.PROD;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: isProduction,
  environment: isProduction ? "production" : "development",
  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,
  // Don't send errors in development
  beforeSend(event) {
    if (!isProduction) return null;
    return event;
  },
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
});

export default Sentry;
