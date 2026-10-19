import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
  INVITE_TTL_HOURS: z.coerce.number().int().positive().default(48),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
});
export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const isProd = source.NODE_ENV === "production";
  const withDefaults = isProd
    ? source
    : {
        WEB_ORIGIN: "http://localhost:3000",
        DATABASE_URL: "postgresql://hawl:change-me@localhost:5432/hawl",
        SESSION_SECRET: "dev-only-secret-dev-only-secret-0000",
        ...source,
      };
  return schema.parse(withDefaults);
}

export const env: Env = loadEnv();
