const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Thin fetch wrapper: cookies included, JSON in and out, throws on non-2xx. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as T;
}
