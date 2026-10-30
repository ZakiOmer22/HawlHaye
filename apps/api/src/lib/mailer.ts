import { env } from "../config/env";
import { logger } from "./logger";

export async function sendPasswordReset(email: string, token: string): Promise<void> {
  const link = `${env.WEB_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;

  if (env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Password reset for ${email}: ${link}`);
    return;
  }

  logger.error(
    { email },
    "PASSWORD RESET REQUESTED but no mailer configured. Wire sendPasswordReset() before go-live.",
  );
  throw new Error("Password reset mailer not configured");
}
