import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN_API,
  environment: process.env.NODE_ENV ?? "development",
  release: process.env.APP_VERSION,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: Boolean(process.env.SENTRY_DSN_API),
});
