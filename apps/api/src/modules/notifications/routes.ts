import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/async";
import { notificationBus } from "../../lib/events";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/stream",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const heartbeat = setInterval(() => {
      res.write(`: ping\n\n`);
    }, 30_000);

    const onNotification = (payload: unknown) => {
      res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const onBoardChanged = () => {
      res.write(`event: board-changed\ndata: {}\n\n`);
    };

    notificationBus.on(`user:${userId}`, onNotification);
    notificationBus.on("board-changed", onBoardChanged);

    req.on("close", () => {
      clearInterval(heartbeat);
      notificationBus.off(`user:${userId}`, onNotification);
      notificationBus.off("board-changed", onBoardChanged);
      res.end();
    });
  }),
);
