// apps/web/instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // HARDCODED FOR TESTING
  dsn: "https://6712cc8f8b06cef887d24ce361aaf083@o4508048532307968.ingest.de.sentry.io/4512343011950672",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
