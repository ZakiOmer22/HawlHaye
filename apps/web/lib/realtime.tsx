"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type NotificationPayload = {
  type: string;
  title: string;
  message: string;
  link?: string;
};

type RealtimeContextValue = {
  notifications: NotificationPayload[];
  unreadCount: number;
  markAllRead: () => void;
  boardVersion: number;
};

const RealtimeCtx = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [boardVersion, setBoardVersion] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const MAX_RETRIES = 5;

    function connect() {
      if (cancelled || retries >= MAX_RETRIES) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const es = new EventSource(`${apiUrl}/api/v1/notifications/stream`, {
          withCredentials: true,
        });
        esRef.current = es;

        es.onopen = () => {
          retries = 0;
        };

        es.addEventListener("notification", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data) as NotificationPayload;
            setNotifications((prev) => [data, ...prev].slice(0, 20));
            setUnreadCount((prev) => prev + 1);
          } catch {
            /* ignore malformed payloads */
          }
        });

        es.addEventListener("board-changed", () => {
          setBoardVersion((v) => v + 1);
        });

        es.onerror = () => {
          es.close();
          esRef.current = null;
          retries++;
          if (retries < MAX_RETRIES && !cancelled) {
            retryTimer = setTimeout(connect, Math.min(30_000, 1000 * Math.pow(2, retries)));
          }
        };
      } catch {
        /* EventSource constructor failed — give up silently */
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      esRef.current?.close();
    };
  }, []);

  return (
    <RealtimeCtx.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead: () => setUnreadCount(0),
        boardVersion,
      }}
    >
      {children}
    </RealtimeCtx.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeCtx);
  if (!ctx) {
    throw new Error("useRealtime must be used inside <RealtimeProvider>");
  }
  return ctx;
}

/**
 * Subscribe to board-change events. Fires `callback` (debounced) whenever the
 * board version increments. Use this in any page that displays live task data.
 */
export function useBoardRealtime(callback: () => void, debounceMs = 500) {
  const { boardVersion } = useRealtime();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const lastVersionRef = useRef(boardVersion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (boardVersion === lastVersionRef.current) return;
    lastVersionRef.current = boardVersion;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      callbackRef.current();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [boardVersion, debounceMs]);
}
