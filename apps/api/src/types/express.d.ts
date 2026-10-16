import type { Role } from "@hawl/shared";

declare global {
  namespace Express {
    interface Request {
      /** Set by the session middleware (Zacki, Day 2). */
      user?: { id: string; role: Role; officeId: string | null };
    }
  }
}
export {};
