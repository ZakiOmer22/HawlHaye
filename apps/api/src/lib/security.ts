import pino from "pino";
import { env } from "../config/env";

export const securityLogger = pino({
  level: "info",
  base: { service: "hawl-api", category: "security" },
  transport:
    env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,category,service",
          },
        }
      : undefined,
});

export type SecurityEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_LOCKED"
  | "LOGOUT"
  | "PERMISSION_DENIED"
  | "INVALID_OBJECT_ACCESS"
  | "ROLE_CHANGED"
  | "ACCOUNT_DEACTIVATED"
  | "ACCOUNT_REACTIVATED"
  | "SESSION_REVOKED"
  | "INVITE_ISSUED"
  | "INVITE_REVOKED"
  | "INVITE_ACCEPTED"
  | "EXPORT_INITIATED"
  | "UPLOAD_RATE_LIMITED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "2FA_ENABLED"
  | "2FA_DISABLED"
  | "2FA_BACKUP_CODES_REGENERATED"
  | "IMPERSONATION_STARTED"
  | "IMPERSONATION_STOPPED";

export interface SecurityEventData {
  userId?: string;
  email?: string;
  targetId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export function logSecurityEvent(event: SecurityEvent, data: SecurityEventData = {}): void {
  securityLogger.info({ event, ...data, ts: new Date().toISOString() }, event);
}
