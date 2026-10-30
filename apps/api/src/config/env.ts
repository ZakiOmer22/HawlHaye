import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  // ── Core ────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // ── Existing ────────────────────────────────────────────────
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  INVITE_TTL_HOURS: z.coerce.number().int().positive().default(48),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
  IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  LEADERSHIP_2FA_GRACE_DAYS: z.coerce.number().int().min(0).default(7),

  // ── New: Network / headers ──────────────────────────────────
  ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // ── New: Sessions ───────────────────────────────────────────
  SESSION_COOKIE_NAME: z.string().default("session"),

  // ── New: CSRF + audit chain ─────────────────────────────────
  CSRF_SECRET: z.string().min(32),
  AUDIT_CHAIN_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const isProd = source.NODE_ENV === "production";
  const withDefaults = isProd
    ? source
    : {
        // Dev-only fallbacks — real values from .env always win
        WEB_ORIGIN: "http://localhost:3000",
        DATABASE_URL: "postgresql://hawl:change-me@localhost:5432/hawl",
        SESSION_SECRET: "dev-only-secret-dev-only-secret-0000",
        // Deterministic dev-only secrets so the app boots without .env
        CSRF_SECRET: "dev-only-csrf-secret-dev-only-csrf-secret-0000",
        AUDIT_CHAIN_SECRET: "dev-only-audit-secret-dev-only-audit-secret-0000",
        IDLE_TIMEOUT_MINUTES: "30",
        PASSWORD_RESET_TTL_MINUTES: "60",
        ...source,
      };
  const parsed = schema.safeParse(withDefaults);
  if (!parsed.success) {
    console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env: Env = loadEnv();
