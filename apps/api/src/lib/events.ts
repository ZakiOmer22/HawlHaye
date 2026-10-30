import { EventEmitter } from "node:events";

class NotificationBus extends EventEmitter {}
export const notificationBus = new NotificationBus();
notificationBus.setMaxListeners(1000);

export type NotificationPayload = {
  type: "TASK_ASSIGNED" | "DELEGATION_RECEIVED" | "TASK_TRANSITIONED";
  title: string;
  message: string;
  link?: string;
};

export function emitNotification(userId: string, payload: NotificationPayload) {
  notificationBus.emit(`user:${userId}`, payload);
}

export function emitBoardChanged() {
  notificationBus.emit("board-changed");
}
