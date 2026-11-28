import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import { API_URL } from "../config";
import { baseHeaders } from "../api/client";

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  link?: string;
}
interface RealtimeValue {
  notifications: NotificationPayload[];
  unreadCount: number;
  markAllRead: () => void;
  boardVersion: number;
}
const Ctx = createContext<RealtimeValue | null>(null);
type Evt = "notification" | "board-changed";

/** Same behaviour as apps/web/lib/realtime.tsx, over the API's SSE stream (foreground only). */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [boardVersion, setBoardVersion] = useState(0);
  const esRef = useRef<EventSource<Evt> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const close = () => {
      esRef.current?.removeAllEventListeners();
      esRef.current?.close();
      esRef.current = null;
    };
    const connect = () => {
      if (cancelled || esRef.current) return;
      const es = new EventSource<Evt>(`${API_URL}/api/v1/notifications/stream`, {
        headers: baseHeaders(),
        withCredentials: true,
        pollingInterval: 0,
        timeoutBeforeConnection: 0,
        timeout: 0,
      });
      esRef.current = es;
      es.addEventListener("open", () => {
        retries = 0;
      });
      es.addEventListener("notification", (e) => {
        if (!("data" in e) || !e.data) return;
        try {
          const d = JSON.parse(e.data) as NotificationPayload;
          setNotifications((p) => [d, ...p].slice(0, 20));
          setUnreadCount((n) => n + 1);
          setBoardVersion((v) => v + 1);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("board-changed", () => setBoardVersion((v) => v + 1));
      es.addEventListener("error", () => {
        close();
        if (cancelled) return;
        retries += 1;
        timer = setTimeout(connect, Math.min(60_000, 1000 * 2 ** Math.min(retries, 6)));
      });
    };
    connect();
    const poll = setInterval(() => setBoardVersion((v) => v + 1), 60_000); // fallback if SSE is unavailable
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        retries = 0;
        connect();
        setBoardVersion((v) => v + 1);
      } else {
        close();
        if (timer) clearTimeout(timer);
      }
    });
    return () => {
      cancelled = true;
      clearInterval(poll);
      if (timer) clearTimeout(timer);
      sub.remove();
      close();
    };
  }, []);

  const markAllRead = useCallback(() => setUnreadCount(0), []);
  const value = useMemo(
    () => ({ notifications, unreadCount, markAllRead, boardVersion }),
    [notifications, unreadCount, markAllRead, boardVersion],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime(): RealtimeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRealtime must be used inside <RealtimeProvider>");
  return v;
}

/** Debounced "something changed" callback, same as the web's useBoardRealtime. */
export function useBoardRealtime(callback: () => void, debounceMs = 500) {
  const { boardVersion } = useRealtime();
  const cb = useRef(callback);
  cb.current = callback;
  const last = useRef(boardVersion);
  useEffect(() => {
    if (boardVersion === last.current) return;
    last.current = boardVersion;
    const t = setTimeout(() => cb.current(), debounceMs);
    return () => clearTimeout(t);
  }, [boardVersion, debounceMs]);
}
