const BASE = "";

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

  const setJsonContentType = typeof init.body === "string";

  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(setJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: string | undefined;

    try {
      const body = (await res.json()) as ErrorResponse;

      // 1. Handle Rate Limiting Explicitly
      if (res.status === 429) {
        message = body.message || "Too many requests. Please wait a few minutes and try again.";
        code = "too_many_requests";
      }
      // 2. Handle other standard errors
      else if (body.error && typeof body.error === "object") {
        message = body.error.message ?? body.error.code ?? message;
        code = body.error.code;
      } else if (typeof body.error === "string") {
        message = body.message || body.error;
        code = body.error;

        // 🚀 CATCH MAINTENANCE MODE HERE
        if (res.status === 503 && code === "maintenance_mode") {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("maintenance_mode"));
          }
        }
      } else if (body.message) {
        message = body.message;
        code = body.code;
      }
    } catch {
      /* non-JSON error body */
    }

    // 3. Handle Redirects
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

export function isAuthError(err: unknown): err is ApiError {
  return (
    err instanceof ApiError &&
    (err.code === "unauthenticated" || err.code === "session_idle" || err.code === "csrf_failed")
  );
}

export function isPasswordRotationRequired(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === "password_change_required";
}
