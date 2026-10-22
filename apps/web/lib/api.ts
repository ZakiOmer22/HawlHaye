const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Thrown by api() when the server returns a non-2xx response.
 * Use `err instanceof ApiError` in catch blocks to surface `err.message`.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thin fetch wrapper: cookies included, JSON in and out, throws ApiError on non-2xx. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string } | null;
      message = body?.message ?? body?.error ?? message;
    } catch {
      /* non-JSON error body — keep default */
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content: DELETE /tasks/:id, POST /auth/logout, etc.
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
