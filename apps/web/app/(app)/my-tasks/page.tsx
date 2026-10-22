"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { formatDate, isOverdue } from "@/lib/format";
import { CheckCircle2, AlertCircle, Clock, ChevronRight, Inbox } from "lucide-react";

const STATUS_STYLES: Record<TaskStatus, string> = {
  UNASSIGNED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  ASSIGNED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_PROGRESS: "bg-[#e8bc69]/10 text-[#e8bc69] border-[#e8bc69]/20",
  BLOCKED: "bg-red-500/10 text-red-400 border-red-500/20",
  REVIEW: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: Task[] }>("/tasks?mine=true&take=200")
      .then((r) => {
        const sorted = [...r.data].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        setTasks(sorted);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load tasks</h2>
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
        <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-5 border-b border-[#334155] last:border-0"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-[#0F172A]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#0F172A]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[#0F172A]" />
              </div>
            </div>
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
            Personal Queue
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">My Tasks</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Everything you own or that has been delegated to you.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2">
          <span className="text-sm font-bold text-white">{tasks.length}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Active</span>
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155]">
            <Inbox className="h-8 w-8 text-[#e8bc69]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">You're all caught up!</h2>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto">
            There are no tasks currently assigned to you. When a task is assigned or delegated, it
            will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#334155] bg-[#1E293B] shadow-lg">
          {tasks.map((t, i) => {
            const overdue = isOverdue(t.dueDate, t.status);
            return (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className={`group flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 transition-colors hover:bg-[#0F172A]/50 ${
                  i > 0 ? "border-t border-[#334155]" : ""
                }`}
              >
                {/* Code & Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[11px] font-bold tracking-wider text-[#94A3B8]">
                      {t.code}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[t.status]}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="truncate text-base font-bold text-white group-hover:text-[#e8bc69] transition-colors">
                    {t.title}
                  </p>
                </div>

                {/* Right side metadata */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex items-center gap-2">
                    {t.status === "COMPLETED" ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : t.status === "BLOCKED" ? (
                      <AlertCircle size={16} className="text-red-400" />
                    ) : (
                      <Clock size={16} className={overdue ? "text-red-400" : "text-[#94A3B8]"} />
                    )}
                    <span
                      className={`text-xs font-bold ${overdue ? "text-red-400" : "text-[#94A3B8]"}`}
                    >
                      {t.dueDate ? formatDate(t.dueDate) : "No due date"}
                    </span>
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-[#475569] group-hover:text-[#e8bc69] group-hover:translate-x-1 transition-all"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
