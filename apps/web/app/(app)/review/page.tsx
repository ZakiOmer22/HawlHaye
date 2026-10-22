"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Task } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { CheckCircle2, RotateCcw, AlertCircle, Clock } from "lucide-react";

export default function ReviewQueuePage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Returning
  const [pendingReturn, setPendingReturn] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setError(err instanceof ApiError ? err.message : "Failed to load review queue");
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function executeAction(taskId: string, to: "COMPLETED" | "IN_PROGRESS", reason?: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      await api(`/tasks/${taskId}/transition`, {
        method: "POST",
        body: JSON.stringify({ to, reason }),
      });
      setPendingReturn(null);
      setReasonInput("");
      await loadTasks(); // Refresh the list
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate how many days a task has been waiting in review
  const getWaitingTime = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  if (error && !tasks) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load queue</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!tasks) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            Approvals
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">Review Queue</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Tasks submitted by staff that require your approval to be marked as completed.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2">
          <span className="text-sm font-bold text-white">{tasks.length}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Pending</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {error}
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155]">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Queue is clear!</h2>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto">
            There are no tasks waiting for review. When staff submit their work, it will appear here
            for approval.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-[#334155] bg-[#1E293B] p-6 shadow-sm hover:border-[#e8bc69]/30 transition-colors"
            >
              {/* Task Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-[#94A3B8]">
                    {task.code}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    <Clock size={10} /> Waiting {getWaitingTime(task.updatedAt)}
                  </span>
                </div>

                <Link href={`/tasks/${task.id}`} className="block group">
                  <h3 className="text-lg font-bold text-white group-hover:text-[#e8bc69] transition-colors truncate">
                    {task.title}
                  </h3>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#94A3B8]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px]">Owner:</span>
                    <span className="font-medium text-white">
                      {task.owner?.fullName ?? "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px]">Due:</span>
                    <span
                      className={`font-medium ${task.dueDate && new Date(task.dueDate) < new Date() ? "text-red-400" : "text-white"}`}
                    >
                      {task.dueDate ? formatDate(task.dueDate) : "None"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      Category:
                    </span>
                    <span className="font-medium text-white">{task.category?.name ?? "—"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-32">
                <button
                  onClick={() => executeAction(task.id, "COMPLETED")}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#e8bc69] px-4 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Accept
                </button>

                <button
                  onClick={() => setPendingReturn(task.id)}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <RotateCcw size={16} /> Return
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RETURN REASON MODAL */}
      <Modal
        isOpen={!!pendingReturn}
        onClose={() => {
          setPendingReturn(null);
          setReasonInput("");
        }}
        title="Return Task to In Progress"
        description="Please provide a comment explaining why this task is being returned. The owner will see this in the task history."
      >
        <div className="space-y-4">
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="e.g. Missing required documentation, please attach the signed forms..."
            rows={4}
            className="w-full rounded-xl border border-[#334155] bg-[#0F172A] p-3 text-white outline-none focus:border-[#e8bc69]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setPendingReturn(null);
                setReasonInput("");
              }}
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#94A3B8] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                pendingReturn && executeAction(pendingReturn, "IN_PROGRESS", reasonInput)
              }
              disabled={isSubmitting || reasonInput.trim().length < 3}
              className="rounded-lg bg-[#e8bc69] px-5 py-2 text-sm font-bold text-[#0F172A] disabled:opacity-50"
            >
              {isSubmitting ? "Returning..." : "Return Task"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
