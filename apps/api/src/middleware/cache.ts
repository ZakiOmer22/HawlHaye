import type { RequestHandler } from "express";

export const cacheControl: RequestHandler = (req, res, next) => {
  // Do not cache SSE streams
  if (req.path === "/notifications/stream") {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return next();
  }

  if (req.method === "GET") {
    // Disable browser caching for all API responses to prevent data leaks on shared machines
    res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }
  next();
};
