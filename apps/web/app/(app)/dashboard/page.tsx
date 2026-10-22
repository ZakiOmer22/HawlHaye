"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { isOverdue } from "@/lib/format";
import {
  CalendarDays,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface Stats {
  dueThisWeek: number;
  overdue: number;
  blocked: number;
  inReview: number;
  completed: number;
}

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  UNASSIGNED: { label: "Unassigned", color: "bg-slate-400", bg: "bg-slate-400/20" },
  ASSIGNED: { label: "Assigned", color: "bg-blue-400", bg: "bg-blue-400/20" },
  IN_PROGRESS: { label: "In Progress", color: "bg-[#e8bc69]", bg: "bg-[#e8bc69]/20" },
  BLOCKED: { label: "Blocked", color: "bg-red-400", bg: "bg-red-400/20" },
  REVIEW: { label: "In Review", color: "bg-violet-400", bg: "bg-violet-400/20" },
  COMPLETED: { label: "Completed", color: "bg-emerald-400", bg: "bg-emerald-400/20" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<TaskStatus, number> | null>(null);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: Record<TaskStatus, Task[]> }>("/tasks/board")
      .then((r) => {
        const all = Object.values(r.data).flat();
        const now = Date.now();
        const weekAhead = now + 7 * 24 * 3600 * 1000;

        // 1. Calculate Stats
        setStats({
          dueThisWeek: all.filter(
            (t) =>
              t.dueDate &&
              t.status !== "COMPLETED" &&
              new Date(t.dueDate).getTime() >= now &&
              new Date(t.dueDate).getTime() <= weekAhead,
          ).length,
          overdue: all.filter(
            (t) => t.dueDate && t.status !== "COMPLETED" && new Date(t.dueDate).getTime() < now,
          ).length,
          blocked: all.filter((t) => t.status === "BLOCKED").length,
          inReview: all.filter((t) => t.status === "REVIEW").length,
          completed: all.filter((t) => t.status === "COMPLETED").length,
        });

        // 2. Status Counts for Chart
        const counts: Record<TaskStatus, number> = {
          UNASSIGNED: r.data.UNASSIGNED.length,
          ASSIGNED: r.data.ASSIGNED.length,
          IN_PROGRESS: r.data.IN_PROGRESS.length,
          BLOCKED: r.data.BLOCKED.length,
          REVIEW: r.data.REVIEW.length,
          COMPLETED: r.data.COMPLETED.length,
        };
        setStatusCounts(counts);

        // 3. Get Urgent Tasks (Overdue or Blocked, sorted by date)
        const urgent = all
          .filter(
            (t) =>
              t.status !== "COMPLETED" &&
              (isOverdue(t.dueDate, t.status) || t.status === "BLOCKED"),
          )
          .sort((a, b) => {
            if (a.status === "BLOCKED" && b.status !== "BLOCKED") return -1;
            if (b.status === "BLOCKED" && a.status !== "BLOCKED") return 1;
            return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
          })
          .slice(0, 5);
        setUrgentTasks(urgent);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load dashboard</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats || !statusCounts) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-[#1E293B]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-[#1E293B] border border-[#334155]"
            />
          ))}
        </div>
      </div>
    );
  }

  // Find max count for the chart scale
  const maxCount = Math.max(...Object.values(statusCounts), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
          Overview
        </p>
        <h1 className="mt-1 text-3xl font-black text-white">Dashboard</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">The five numbers that matter at a glance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Due this week"
          value={stats.dueThisWeek}
          icon={<CalendarDays size={20} />}
          color="text-amber-400"
          bg="bg-amber-500/10 border-amber-500/20"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle size={20} />}
          color="text-red-400"
          bg="bg-red-500/10 border-red-500/20"
        />
        <StatCard
          label="Blocked"
          value={stats.blocked}
          icon={<Ban size={20} />}
          color="text-rose-400"
          bg="bg-rose-500/10 border-rose-500/20"
        />
        <StatCard
          label="In review"
          value={stats.inReview}
          icon={<Clock size={20} />}
          color="text-violet-400"
          bg="bg-violet-500/10 border-violet-500/20"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 size={20} />}
          color="text-emerald-400"
          bg="bg-emerald-500/10 border-emerald-500/20"
        />
      </div>

      {/* Bottom Section: Chart & Urgent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Chart (CSS Bars) */}
        <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-[#e8bc69]" />
              Workload Distribution
            </h2>
            <span className="text-xs font-bold text-[#94A3B8] bg-[#0F172A] px-3 py-1 rounded-lg border border-[#334155]">
              All Tasks
            </span>
          </div>

          <div className="space-y-5">
            {(Object.keys(statusCounts) as TaskStatus[]).map((status) => {
              const count = statusCounts[status];
              const percentage = (count / maxCount) * 100;
              const meta = STATUS_META[status];

              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-white">{meta.label}</span>
                    <span className="text-xs font-bold text-[#94A3B8]">{count} tasks</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-[#0F172A] border border-[#334155] overflow-hidden">
                    <div
                      className={`h-full ${meta.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Attention List */}
        <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              Needs Attention
            </h2>
            <Link
              href="/board"
              className="text-xs font-bold text-[#e8bc69] hover:text-white transition flex items-center gap-1"
            >
              View Board <ArrowRight size={14} />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {urgentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
                <p className="text-sm font-bold text-white">Everything is on track!</p>
                <p className="text-xs text-[#94A3B8]">No overdue or blocked tasks.</p>
              </div>
            ) : (
              urgentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="group flex items-start gap-4 rounded-xl border border-[#334155] bg-[#0F172A] p-4 transition hover:border-[#e8bc69]/40"
                >
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${task.status === "BLOCKED" ? "bg-red-400" : "bg-amber-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-[#e8bc69] transition-colors truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-[#94A3B8]">
                      <span>{task.code}</span>
                      <span>•</span>
                      <span
                        className={task.status === "BLOCKED" ? "text-red-400" : "text-amber-400"}
                      >
                        {task.status === "BLOCKED" ? "Blocked" : "Overdue"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-[#1E293B] p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${bg}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className={`text-[10px] font-extrabold uppercase tracking-wider ${color}`}>{label}</p>
        <div className={`p-2 rounded-lg bg-[#0F172A] ${color}`}>{icon}</div>
      </div>
      <p className="text-4xl font-black text-white">{value}</p>
    </div>
  );
}
