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
            // This removes the huge JSON blocks for req and res
            ignore: "pid,hostname,req,res",
            // This formats the final line beautifully
            messageFormat: "{msg} ({responseTime}ms)",
          },
        }
      : undefined,
});
