"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { MonitorSmartphone, Loader2, Trash2, AlertCircle, RefreshCw } from "lucide-react";

type Session = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function describeUA(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile device";
  if (/edg/i.test(ua)) return "Edge browser";
  if (/chrome/i.test(ua)) return "Chrome browser";
  if (/firefox/i.test(ua)) return "Firefox browser";
  if (/safari/i.test(ua)) return "Safari browser";
  return "Browser";
}

export function ActiveSessionsCard() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ data: Session[] }>("/auth/sessions");
      setSessions(r.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load sessions");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(s: Session) {
    if (!confirm("Sign out this session? The device will be logged out immediately.")) return;
    setBusy(s.id);
    setError(null);
    try {
      await api(`/auth/sessions/${s.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to revoke session");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155]">
            <MonitorSmartphone className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Active Sessions</h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Every device currently signed in to your account. Revoke anything you don&apos;t
              recognize.
            </p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="shrink-0 rounded-lg p-2 text-[#94A3B8] hover:text-white hover:bg-[#0F172A] transition"
          title="Refresh"
          aria-label="Refresh sessions"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-400">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {sessions === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-[#e8bc69]" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#94A3B8]">No active sessions.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const busyRow = busy === s.id;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#334155] bg-[#0F172A] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{describeUA(s.userAgent)}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
                    {s.ip ?? "Unknown IP"} · Last active {relativeTime(s.lastSeenAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(s)}
                  disabled={busyRow}
                  className="shrink-0 rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                  title="Sign out this session"
                  aria-label="Sign out this session"
                >
                  {busyRow ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
