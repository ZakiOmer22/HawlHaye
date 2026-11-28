import { getItem, setItem, deleteItem } from "../lib/storage"; // Use cross-platform storage
import { API_URL, WEB_ORIGIN } from "../config";
import { Platform } from "react-native";

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

const CSRF_KEY = "hawl.csrf";
let csrfToken: string | null = null;
let onSessionLost: (() => void) | null = null;
let onPasswordChangeRequired: (() => void) | null = null;

export async function loadCsrf(): Promise<void> {
  csrfToken = await getItem(CSRF_KEY);
}
export async function setCsrf(token: string | null): Promise<void> {
  csrfToken = token;
  if (token) await setItem(CSRF_KEY, token);
  else await deleteItem(CSRF_KEY);
}
export function setSessionLostHandler(fn: (() => void) | null) {
  onSessionLost = fn;
}
export function setPasswordChangeHandler(fn: (() => void) | null) {
  onPasswordChangeRequired = fn;
}

/** Headers every request needs */
export function baseHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  // Only set Origin on Web (browsers do this automatically)
  if (Platform.OS === "web") {
    headers["Origin"] = WEB_ORIGIN;
  }

  return headers;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const AUTH_FREE = new Set([
  "/auth/login",
  "/auth/2fa/authenticate",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/invite/accept",
]);
const SESSION_CODES = new Set(["unauthenticated", "session_idle", "csrf_failed"]);

interface Opts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

type ErrBody = {
  message?: string;
  error?: string | { code?: string; message?: string };
  issues?: { path: (string | number)[]; message: string }[];
};

export async function request<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { ...baseHeaders(), ...opts.headers };

  let body: string | FormData | undefined;

  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  } else if (MUTATING.has(method)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({});
  }

  if (MUTATING.has(method) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
    // Append CSRF to body as well for strict backends
    if (headers["Content-Type"] === "application/json" && typeof body === "string") {
      try {
        const parsedBody = JSON.parse(body);
        parsedBody._csrf = csrfToken;
        body = JSON.stringify(parsedBody);
      } catch {
        // Ignore JSON parse errors, use default message
      }
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body,
      credentials: "include",
      signal: ctrl.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new ApiError(
      0,
      aborted ? "Request timed out" : "Network error. Check your connection.",
      "network",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const j = (await res.json()) as ErrBody;
      if (j.error && typeof j.error === "object") {
        code = j.error.code;
        message = j.error.message ?? message;
      } else {
        if (typeof j.error === "string") code = j.error;
        if (j.message) message = j.message;
        if (j.issues?.length) message = j.issues.map((i) => i.message).join("\n");
      }
    } catch {
      // Ignore JSON parse errors, use default message
    }
    if (res.status === 429) code = "too_many_requests";

    if (code && SESSION_CODES.has(code) && !AUTH_FREE.has(path)) onSessionLost?.();
    if (code === "password_change_required") onPasswordChangeRequired?.();
    throw new ApiError(res.status, message, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function data<T>(path: string, opts?: Opts): Promise<T> {
  const r = await request<{ data: T }>(path, opts);
  return r.data;
}
