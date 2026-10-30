import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProd = process.env.NODE_ENV === "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // ── Build connect-src: allow self, the API, Sentry, and (in dev) localhost HMR ──
  const connectSrc = ["'self'", apiUrl, "https://*.sentry.io", "https://*.ingest.de.sentry.io"];

  if (!isProd) {
    connectSrc.push("ws://localhost:*", "http://localhost:*");
  }

  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:", // Required for Sentry Replay
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  // Only upgrade to HTTPS in production — never in dev (breaks localhost)
  if (isProd) {
    directives.push("upgrade-insecure-requests");
  }

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  response.headers.set("Content-Security-Policy", directives.join("; "));

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
