import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRealtime } from "../realtime/RealtimeProvider";
import { ApiError } from "../api/client";

/**
 * Loads data on focus and whenever the realtime layer reports a change.
 * Keeps the previous data on screen while refreshing (no flicker).
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = [], live = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { boardVersion } = useRealtime();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(async (mode: "initial" | "pull" | "silent") => {
    const my = ++seq.current;
    if (mode === "pull") setRefreshing(true);
    try {
      const r = await fnRef.current();
      if (my !== seq.current) return;
      setData(r);
      setError(null);
    } catch (e) {
      if (my !== seq.current) return;
      if (mode !== "silent" || data === null) {
        setError(e instanceof ApiError ? e.message : "Something went wrong");
      }
    } finally {
      if (my === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(
    useCallback(() => {
      void run("initial");
    }, [run, ...deps]),
  );
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (live) void run("silent");
  }, [boardVersion, live, run]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => run("pull"),
    silentReload: () => run("silent"),
    setData,
  };
}
