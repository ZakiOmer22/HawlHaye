import { env } from "../config/env";

export const LEADERSHIP_ROLES = ["ADMINISTRATOR", "DEAN", "DEPUTY"] as const;
export type LeadershipRole = (typeof LEADERSHIP_ROLES)[number];

export function isLeadership(role: string): role is LeadershipRole {
  return (LEADERSHIP_ROLES as readonly string[]).includes(role);
}

export type TwoFAEnforcement = "n/a" | "active" | "warning" | "blocked";

export interface TwoFAStatus {
  enforcement: TwoFAEnforcement;
  /** null when n/a or active. 0 when blocked. */
  daysLeft: number | null;
  /** ISO timestamp of the grace period end, or null. */
  exemptUntil: string | null;
}

export function compute2FAStatus(user: {
  role: string;
  twoFactorEnabled: boolean;
  twoFAExemptUntil: Date | null;
}): TwoFAStatus {
  if (!isLeadership(user.role)) {
    return { enforcement: "n/a", daysLeft: null, exemptUntil: null };
  }
  if (user.twoFactorEnabled) {
    return { enforcement: "active", daysLeft: null, exemptUntil: null };
  }
  if (!user.twoFAExemptUntil) {
    // Grace not yet started — treated as fresh warning
    return {
      enforcement: "warning",
      daysLeft: env.LEADERSHIP_2FA_GRACE_DAYS,
      exemptUntil: null,
    };
  }
  const now = Date.now();
  const until = user.twoFAExemptUntil.getTime();
  if (until > now) {
    const daysLeft = Math.ceil((until - now) / 86_400_000);
    return {
      enforcement: "warning",
      daysLeft,
      exemptUntil: user.twoFAExemptUntil.toISOString(),
    };
  }
  return { enforcement: "blocked", daysLeft: 0, exemptUntil: user.twoFAExemptUntil.toISOString() };
}

/** Starts the grace period if it hasn't been started yet. */
export async function ensure2FAGraceStarted(
  prisma: import("@prisma/client").PrismaClient,
  userId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, twoFactorEnabled: true, twoFAExemptUntil: true },
  });
  if (!user) return;
  if (!isLeadership(user.role)) return;
  if (user.twoFactorEnabled) return;
  if (user.twoFAExemptUntil) return;

  const graceUntil = new Date(Date.now() + env.LEADERSHIP_2FA_GRACE_DAYS * 86_400_000);
  await prisma.user.update({
    where: { id: userId },
    data: { twoFAExemptUntil: graceUntil },
  });
}
