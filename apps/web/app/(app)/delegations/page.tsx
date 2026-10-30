"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import { CheckCircle2, XCircle, AlertCircle, Inbox } from "lucide-react";

type PendingDelegation = {
  id: string;
  reason: string | null;
  createdAt: string;
  task: {
    id: string;
    code: string;
    title: string;
    priority: string;
    dueDate: string | null;
    status: string;
  };
  delegatedBy: { id: string; fullName: string };
};

export default function DelegationsPage() {
  const { t } = usePreferences();
  const [delegations, setDelegations] = useState<PendingDelegation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const loadDelegations = useCallback(async () => {
    try {
      const res = await api<{ data: PendingDelegation[] }>("/tasks/delegations/pending");
      setDelegations(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load delegations");
    }
  }, []);

  useEffect(() => {
    void loadDelegations();
  }, [loadDelegations]);

  async function respond(delegation: PendingDelegation, action: "ACCEPTED" | "DECLINED") {
    setActionBusy(delegation.id);
    setError(null);
    try {
      await api(`/tasks/${delegation.task.id}/delegation/${delegation.id}/respond`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setAnnouncement(
        action === "ACCEPTED"
          ? `Task "${delegation.task.title}" accepted.`
          : `Task "${delegation.task.title}" declined.`,
      );
      await loadDelegations();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to respond to delegation");
    } finally {
      setActionBusy(null);
    }
  }

  if (error && !delegations) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load inbox</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!delegations) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
        <div className="h-10 w-48 rounded bg-[#1E293B] animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-[#1E293B] border border-[#334155] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-12">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            {t("nav.delegations")}
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{t("delegations.title")}</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">{t("delegations.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2">
          <span className="text-sm font-bold text-white">{delegations.length}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            {t("delegations.pending")}
          </span>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400"
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {delegations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155] shadow-inner">
            <Inbox className="h-8 w-8 text-[#64748B]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t("delegations.empty.title")}</h2>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
            {t("delegations.empty.desc")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {delegations.map((d) => {
            const busy = actionBusy === d.id;
            return (
              <div
                key={d.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-[#334155] bg-[#1E293B] p-5 md:p-6 shadow-sm hover:border-[#e8bc69]/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-[11px] font-mono font-bold tracking-wider text-[#64748B] bg-[#0F172A] px-2 py-0.5 rounded border border-[#334155]">
                      {d.task.code}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md border border-amber-400/20">
                      {t("delegations.pending")}
                    </span>
                  </div>

                  <Link href={`/tasks/${d.task.id}`} className="block group w-fit">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#e8bc69] transition-colors truncate">
                      {d.task.title}
                    </h3>
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#94A3B8]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px]">
                        {t("delegations.from")}:
                      </span>
                      <span className="font-medium text-white">
                        {d.delegatedBy?.fullName ?? "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px]">
                        {t("board.table.dueDate")}:
                      </span>
                      <span
                        className={`font-medium ${d.task.dueDate && new Date(d.task.dueDate) < new Date() ? "text-red-400" : "text-white"}`}
                      >
                        {d.task.dueDate ? formatDate(d.task.dueDate) : "None"}
                      </span>
                    </div>
                  </div>

                  {d.reason && (
                    <div className="mt-3 rounded-lg bg-[#0F172A] border border-[#334155] p-3 text-xs text-[#94A3B8] italic">
                      "{d.reason}"
                    </div>
                  )}
                </div>

                <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-32">
                  <button
                    onClick={() => void respond(d, "ACCEPTED")}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#e8bc69] px-4 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> {t("delegations.accept")}
                  </button>
                  <button
                    onClick={() => void respond(d, "DECLINED")}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <XCircle size={16} /> {t("delegations.decline")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
