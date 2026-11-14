import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // 1. Generate a unique nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // 2. Build connect-src: allow self, the API, Sentry, and localhost HMR
  const connectSrc = ["'self'", apiUrl, "https://*.sentry.io", "https://*.ingest.de.sentry.io"];
  if (!isProd) {
    connectSrc.push("ws://localhost:*", "http://localhost:*");
  }

  // 3. Construct the CSP directives
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isProd ? "" : "'unsafe-eval'"};
    style-src 'self' 'unsafe-inline' https:;
    img-src 'self' blob: data: https:;
    font-src 'self' https:;
    connect-src ${connectSrc.join(" ")};
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isProd ? "upgrade-insecure-requests;" : ""}
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // 4. Set headers on the request so `layout.tsx` can read the nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // 5. Create the response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 6. Apply security headers to the response
  response.headers.set("Content-Security-Policy", cspHeader);
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

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
