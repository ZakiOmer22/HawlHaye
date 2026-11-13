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

    // 1. Set production-ready SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Critical for Nginx/Vercel proxies

    // 2. Tell the client to wait 5 seconds before reconnecting if disconnected
    res.write("retry: 5000\n\n");

    // 3. Flush headers immediately so the client knows the connection is open
    res.flushHeaders();
    res.write(": connected\n\n");

    // 4. Heartbeat to keep the connection alive through firewalls (15s)
    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 15_000);

    // 5. Event Listeners
    const onNotification = (payload: unknown) => {
      res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    const onBoardChanged = () => {
      res.write(`event: board-changed\ndata: {}\n\n`);
    };

    notificationBus.on(`user:${userId}`, onNotification);
    notificationBus.on("board-changed", onBoardChanged);

    // 6. Cleanup on disconnect to prevent memory leaks
    req.on("close", () => {
      clearInterval(heartbeat);
      notificationBus.off(`user:${userId}`, onNotification);
      notificationBus.off("board-changed", onBoardChanged);
      res.end();
    });
  }),
);
