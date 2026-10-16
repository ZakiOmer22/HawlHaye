import type { NextFunction, Request, Response } from "express";

/**
 * TODO (Zacki, Day 2): replace with real session lookup (httpOnly cookie -> sessions table),
 * set req.user, enforce idle/absolute timeout, reject deactivated users.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  next();
}
