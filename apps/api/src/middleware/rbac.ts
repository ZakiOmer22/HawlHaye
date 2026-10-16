import type { NextFunction, Request, Response } from "express";
import type { Role } from "@hawl/shared";

/** Deny by default. Object-level checks (own office, own task) live in each module's service. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}
