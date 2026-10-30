"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Task } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import { Modal } from "@/components/ui/Modal";
import { CheckCircle2, RotateCcw, AlertCircle, Clock, Loader2 } from "lucide-react";

export default function ReviewQueuePage() {
  const { t } = usePreferences();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Modal State for Returning
  const [pendingReturn, setPendingReturn] = useState<Task | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      // Fetch tasks that are currently in the REVIEW status
      const res = await api<{ data: Task[] }>("/tasks?status=REVIEW&take=100");
      // Sort by updatedAt so the oldest waiting tasks are at the top
      const sorted = [...res.data].sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      );
      setTasks(sorted);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("review.error.load"));
    }
  }, [t]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function executeAction(task: Task, to: "COMPLETED" | "IN_PROGRESS", reason?: string) {
    setActionBusy(task.id);
    setError(null);
    try {
      await api(`/tasks/${task.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to, reason }),
      });

      if (to === "COMPLETED") {
        setAnnouncement(t("review.announce.accepted", { title: task.title }));
      } else {
        setAnnouncement(t("review.announce.returned", { title: task.title }));
        setPendingReturn(null);
        setReasonInput("");
      }

      await loadTasks(); // Refresh the list
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("review.error.action"));
    } finally {
      setActionBusy(null);
    }
  }

  // Calculate how many days a task has been waiting in review
  const getWaitingTimeInfo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

    let label = "";
    if (days === 0) label = t("review.wait.today");
    else if (days === 1) label = t("review.wait.oneDay");
    else label = t("review.wait.days", { days });

    // Color coding based on wait time
    let colorClass = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"; // < 1 day
    if (days >= 5)
      colorClass = "text-red-400 bg-red-400/10 border-red-400/20"; // 5+ days
    else if (days >= 3)
      colorClass = "text-amber-400 bg-amber-400/10 border-amber-400/20"; // 3-4 days
    else if (days >= 1) colorClass = "text-blue-400 bg-blue-400/10 border-blue-400/20"; // 1-2 days

    return { label, colorClass };
  };

  if (error && !tasks) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">{t("review.error.load")}</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!tasks) {
    return (
      <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-[#1E293B]" />
          <div className="h-8 w-64 animate-pulse rounded bg-[#1E293B]" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-[#1E293B] border border-[#334155]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            {t("review.title")}
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{t("review.heading")}</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">{t("review.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#334155] bg-[#1E293B] px-5 py-3 shadow-sm">
          <span className="text-2xl font-black text-[#e8bc69]">{tasks.length}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            {t("review.pending")}
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

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155] shadow-inner">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t("review.empty.title")}</h2>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
            {t("review.empty.desc")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const busy = actionBusy === task.id;
            const waitInfo = getWaitingTimeInfo(task.updatedAt);
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

            return (
              <div
                key={task.id}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border bg-[#1E293B] p-5 md:p-6 shadow-sm transition-all ${
                  busy
                    ? "opacity-60 border-[#334155]"
                    : "border-[#334155] hover:border-[#e8bc69]/40"
                }`}
              >
                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-[11px] font-mono font-bold tracking-wider text-[#64748B] bg-[#0F172A] px-2 py-0.5 rounded border border-[#334155]">
                      {task.code}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${waitInfo.colorClass}`}
                    >
                      <Clock size={11} /> {waitInfo.label}
                    </span>
                  </div>

                  <Link href={`/tasks/${task.id}`} className="block group w-fit">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#e8bc69] transition-colors truncate">
                      {task.title}
                    </h3>
                  </Link>

                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-[#94A3B8]">
                        {t("review.table.owner")}:
                      </span>
                      <span className="font-medium text-white bg-[#0F172A] px-2 py-1 rounded-md border border-[#334155]">
                        {task.owner?.fullName ?? t("review.table.unknown")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-[#94A3B8]">
                        {t("review.table.due")}:
                      </span>
                      <span className={`font-bold ${isOverdue ? "text-red-400" : "text-white"}`}>
                        {task.dueDate ? formatDate(task.dueDate) : t("review.table.none")}
                      </span>
                    </div>
                    {task.category && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-[#94A3B8]">
                          {t("review.table.category")}:
                        </span>
                        <span className="flex items-center gap-1.5 font-bold text-white">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: task.category.color || "#94A3B8" }}
                          />
                          {task.category.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-36 pt-2 md:pt-0 border-t md:border-t-0 border-[#334155]">
                  <button
                    onClick={() => executeAction(task, "COMPLETED")}
                    disabled={!!actionBusy}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#e8bc69] px-4 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#1E293B]"
                  >
                    {busy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {t("review.action.accept")}
                  </button>

                  <button
                    onClick={() => setPendingReturn(task)}
                    disabled={!!actionBusy}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#1E293B]"
                  >
                    <RotateCcw size={16} /> {t("review.action.return")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RETURN REASON MODAL */}
      <Modal
        isOpen={!!pendingReturn}
        onClose={() => {
          if (!actionBusy) {
            setPendingReturn(null);
            setReasonInput("");
          }
        }}
        title={t("review.return.title")}
        description={t("review.return.desc")}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={t("review.return.placeholder")}
              rows={4}
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] p-4 text-sm text-white placeholder-[#64748B] outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400/40"
            />
            <p
              className={`text-[10px] font-bold text-right ${reasonInput.trim().length < 5 ? "text-amber-400" : "text-emerald-400"}`}
            >
              {reasonInput.trim().length < 5
                ? t("review.return.minChars", { count: 5 - reasonInput.trim().length })
                : t("review.return.ready")}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setPendingReturn(null);
                setReasonInput("");
              }}
              disabled={!!actionBusy}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white transition disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() =>
                pendingReturn && executeAction(pendingReturn, "IN_PROGRESS", reasonInput)
              }
              disabled={!!actionBusy || reasonInput.trim().length < 5}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {actionBusy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("review.return.submitting")}
                </>
              ) : (
                t("review.return.submit")
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
