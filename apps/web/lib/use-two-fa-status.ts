"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

export type TwoFAEnforcement = "n/a" | "active" | "warning" | "blocked";

export interface TwoFAStatus {
  enforcement: TwoFAEnforcement;
  daysLeft: number | null;
  exemptUntil: string | null;
}

export function useTwoFAStatus(): {
  status: TwoFAStatus | null;
  loading: boolean;
  refresh: () => void;
} {
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ data: { twoFAStatus: TwoFAStatus } }>("/auth/me")
      .then((res) => {
        if (!cancelled) setStatus(res.data.twoFAStatus);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { status, loading, refresh: () => setVersion((v) => v + 1) };
}
