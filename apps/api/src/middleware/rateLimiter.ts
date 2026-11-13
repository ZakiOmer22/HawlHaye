import rateLimit from "express-rate-limit";

// Global API Limiter
// 5000 requests per 15 mins is safe for real-time polling apps
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: "too_many_requests",
    message: "You have made too many requests. Please wait a few minutes and try again.",
  },
});

// Auth Limiter (Strict - prevents brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: "too_many_requests",
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

// Heavy Action Limiter (Very Strict - prevents spam)
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    error: "too_many_requests",
    message: "You have exceeded the limit for this action. Please try again later.",
  },
});
