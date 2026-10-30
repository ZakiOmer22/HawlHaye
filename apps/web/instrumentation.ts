// apps/web/instrumentation.ts
export async function register() {
  const runtime = process.env.NEXT_RUNTIME;

  if (runtime === "nodejs") {
    const serverConfigPath = "./sentry.server.config";
    await import(serverConfigPath).catch(() => undefined);
  }

  if (runtime === "edge") {
    const edgeConfigPath = "./sentry.edge.config";
    await import(edgeConfigPath).catch(() => undefined);
  }
}

// Direct re-export — no hand-written wrapper, no type collision.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
