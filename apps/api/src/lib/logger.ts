import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
      "body.newPassword",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            // Hide the bulky JSON objects
            ignore: "pid,hostname,req,res,responseTime",
          },
        }
      : undefined,
});
