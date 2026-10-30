import type { RequestHandler } from "express";

export const cacheControl: RequestHandler = (req, res, next) => {
  if (req.method === "GET") {
    // Cache successful GET requests for 60 seconds at the browser level
    // stale-while-revalidate allows serving stale data while fetching new data in the background
    res.setHeader("Cache-Control", "private, max-age=60, stale-while-revalidate=30");
  }
  next();
};
