const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorResponse {
  message?: string;
  error?: string | { code?: string; message?: string };
  code?: string;
}

/** Read the double-submit CSRF token from the cookie set by /auth/login. */
function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const isMutation = MUTATING.has(method);
  const csrfToken = isMutation ? readCsrfCookie() : null;

  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as ErrorResponse;
      if (body.error && typeof body.error === "object") {
        message = body.error.message ?? body.error.code ?? message;
        code = body.error.code;
      } else if (typeof body.error === "string") {
        message = body.error;
        code = body.code;
      } else if (body.message) {
        message = body.message;
        code = body.code;
      }
    } catch {
      /* non-JSON error body */
    }

    // Global gate: if the backend says password rotation is required,
    // redirect anywhere except the change-password page itself.
    if (
      typeof window !== "undefined" &&
      code === "password_change_required" &&
      window.location.pathname !== "/change-password"
    ) {
      window.location.href = "/change-password";
    }

    throw new ApiError(res.status, message, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Error codes the backend can return. The SPA should branch on `code`
 * (not on `message`) so wording can change without breaking routing.
 *
 *   csrf_failed               — missing/stale X-CSRF-Token → re-login
 *   unauthenticated           — no session → /login
 *   session_idle              — 30-min idle timeout → /login?reason=idle
 *   password_change_required  — mustChangePassword → /change-password
 *   account_locked            — lockout active → "try again later" banner
 *   too_many_requests         — rate limit → "try again later" banner
 */
export function isAuthError(err: unknown): err is ApiError {
  return (
    err instanceof ApiError &&
    (err.code === "unauthenticated" || err.code === "session_idle" || err.code === "csrf_failed")
  );
}

export function isPasswordRotationRequired(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === "password_change_required";
}
