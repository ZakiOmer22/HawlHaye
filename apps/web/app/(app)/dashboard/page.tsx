"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskStatus, User } from "@/lib/types";
import { isOverdue } from "@/lib/format";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import {
  CalendarDays,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  ListChecks,
  LayoutGrid,
  FileBarChart,
  Users,
  Inbox,
} from "lucide-react";

interface Stats {
  dueThisWeek: number;
  overdue: number;
  blocked: number;
  inReview: number;
  completed: number;
}

const STATUSES: TaskStatus[] = [
  "UNASSIGNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "COMPLETED",
];

const STATUS_KEY: Record<TaskStatus, TranslationKey> = {
  UNASSIGNED: "status.unassigned",
  ASSIGNED: "status.assigned",
  IN_PROGRESS: "status.inProgress",
  BLOCKED: "status.blocked",
  REVIEW: "status.review",
  COMPLETED: "status.completed",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  UNASSIGNED: "bg-slate-400",
  ASSIGNED: "bg-blue-400",
  IN_PROGRESS: "bg-accent",
  BLOCKED: "bg-red-400",
  REVIEW: "bg-violet-400",
  COMPLETED: "bg-emerald-400",
};

const ROLE_KEY: Record<string, TranslationKey> = {
  DEAN: "role.dean",
  DEPUTY: "role.deputy",
  FACULTY_COORDINATOR: "role.facultyCoordinator",
  LABS_COORDINATOR: "role.labsCoordinator",
  ADMINISTRATOR: "role.administrator",
  LAB_TECHNICIAN: "role.labTechnician",
};

const LEADERSHIP = new Set([
  "DEAN",
  "DEPUTY",
  "ADMINISTRATOR",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
]);

function greetingKey(): TranslationKey {
  const h = new Date().getHours();
  if (h < 5) return "dashboard.greeting.night";
  if (h < 12) return "dashboard.greeting.morning";
  if (h < 17) return "dashboard.greeting.afternoon";
  if (h < 21) return "dashboard.greeting.evening";
  return "dashboard.greeting.night";
}

type BoardColumnPayload = Task[] | { tasks: Task[]; total: number };
type BoardRaw = Partial<Record<TaskStatus, BoardColumnPayload>>;

function isColumnPayload(value: unknown): value is { tasks: Task[]; total: number } {
  if (typeof value !== "object" || value === null) return false;
  if (!("tasks" in value)) return false;
  const maybe = value as { tasks: unknown };
  return Array.isArray(maybe.tasks);
}

function flattenBoard(raw: BoardRaw | undefined): Task[] {
  if (!raw) return [];
  const out: Task[] = [];
  for (const status of STATUSES) {
    const value = raw[status];
    if (Array.isArray(value)) out.push(...value);
    else if (isColumnPayload(value)) out.push(...value.tasks);
  }
  return out;
}

function priorityRank(p: string): number {
  switch (p) {
    case "URGENT":
      return 0;
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 3;
    default:
      return 4;
  }
}

export default function DashboardPage() {
  const { t } = usePreferences();
  const [user, setUser] = useState<User | null>(null);
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<TaskStatus, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setRefreshing(true);
      try {
        const [me, board] = await Promise.all([
          api<{ data: User }>("/auth/me"),
          api<{ data: BoardRaw }>("/tasks/board"),
        ]);

        const all = flattenBoard(board.data);
        const counts: Record<TaskStatus, number> = {
          UNASSIGNED: 0,
          ASSIGNED: 0,
          IN_PROGRESS: 0,
          BLOCKED: 0,
          REVIEW: 0,
          COMPLETED: 0,
        };
        for (const task of all) counts[task.status] = (counts[task.status] ?? 0) + 1;

        setUser(me.data);
        setAllTasks(all);
        setStatusCounts(counts);
        setError(null);
      } catch (e) {
        if (e instanceof ApiError) {
          switch (e.code) {
            case "unauthenticated":
            case "session_idle":
              setError(t("error.sessionExpired"));
              return;
            case "password_change_required":
              return;
            default:
              setError(e.message);
              return;
          }
        }
        setError(t("dashboard.loadError"));
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo<Stats | null>(() => {
    if (!allTasks) return null;
    const now = Date.now();
    const weekAhead = now + 7 * 24 * 3600 * 1000;

    let dueThisWeek = 0,
      overdue = 0,
      blocked = 0,
      inReview = 0,
      completed = 0;
    for (const task of allTasks) {
      const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
      if (task.status === "COMPLETED") {
        completed++;
        continue;
      }
      if (task.status === "BLOCKED") blocked++;
      if (task.status === "REVIEW") inReview++;
      if (due !== null) {
        if (due < now) overdue++;
        else if (due <= weekAhead) dueThisWeek++;
      }
    }
    return { dueThisWeek, overdue, blocked, inReview, completed };
  }, [allTasks]);

  const myQueue = useMemo(() => {
    if (!allTasks || !user) return [];
    return allTasks
      .filter(
        (task) =>
          task.status !== "COMPLETED" && (task.ownerId === user.id || task.createdById === user.id),
      )
      .sort((a, b) => {
        const aOver = isOverdue(a.dueDate, a.status);
        const bOver = isOverdue(b.dueDate, b.status);
        if (aOver !== bOver) return aOver ? -1 : 1;
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (aDue !== bDue) return aDue - bDue;
        return priorityRank(a.priority) - priorityRank(b.priority);
      })
      .slice(0, 5);
  }, [allTasks, user]);

  const urgentTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks
      .filter(
        (task) =>
          task.status !== "COMPLETED" &&
          (task.status === "BLOCKED" || isOverdue(task.dueDate, task.status)),
      )
      .sort((a, b) => {
        if (a.status === "BLOCKED" && b.status !== "BLOCKED") return -1;
        if (b.status === "BLOCKED" && a.status !== "BLOCKED") return 1;
        return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
      })
      .slice(0, 5);
  }, [allTasks]);

  const upcomingByDay = useMemo(() => {
    if (!allTasks) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const days: { key: string; label: string; date: Date; tasks: Task[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayTasks = allTasks
        .filter((task) => {
          if (!task.dueDate || task.status === "COMPLETED") return false;
          const due = new Date(task.dueDate).getTime();
          return due >= dayStart.getTime() && due < dayEnd.getTime();
        })
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

      if (dayTasks.length > 0) {
        const label =
          i === 0
            ? t("dashboard.upcoming.today")
            : i === 1
              ? t("dashboard.upcoming.tomorrow")
              : dayStart.toLocaleDateString(undefined, { weekday: "long" });
        days.push({
          key: dayStart.toISOString().slice(0, 10),
          label,
          date: dayStart,
          tasks: dayTasks,
        });
      }
    }
    return days;
  }, [allTasks, t]);

  const teamWorkload = useMemo(() => {
    if (!allTasks) return [];
    const map = new Map<string, { name: string; count: number; overdue: number }>();
    for (const task of allTasks) {
      if (task.status === "COMPLETED") continue;
      const key = task.ownerId ?? "__unassigned__";
      const name = task.owner?.fullName ?? t("status.unassigned");
      const current = map.get(key) ?? { name, count: 0, overdue: 0 };
      current.count++;
      if (isOverdue(task.dueDate, task.status)) current.overdue++;
      map.set(key, current);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allTasks, t]);

  const isLeader = user ? LEADERSHIP.has(user.role) : false;
  const showTeamWorkload = isLeader && teamWorkload.length > 1;

  if (error && !allTasks) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 max-w-md text-center"
        >
          <AlertTriangle aria-hidden="true" className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">{t("dashboard.loadError")}</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-accent-text hover:bg-accent-hover"
          >
            <RefreshCw size={16} aria-hidden="true" /> {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!stats || !statusCounts || !user) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
        <div className="h-24 w-full rounded-2xl bg-panel animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-panel border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(statusCounts), 1);
  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const firstName = user.fullName.split(" ")[0];
  const roleLabel = t(ROLE_KEY[user.role] ?? "role.administrator");

  const summaryText =
    totalCount === 0
      ? t("dashboard.summary.noTasks")
      : stats.overdue > 0
        ? t("dashboard.summary.withOverdue", { count: totalCount, overdue: stats.overdue })
        : t("dashboard.summary.clear", { count: totalCount });

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      {/* Greeting Header */}
      <header className="rounded-2xl border border-border bg-gradient-to-br from-panel via-panel to-app p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(232,188,105,0.08),_transparent_55%)] pointer-events-none"
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
              {t("dashboard.overviewAs", { role: roleLabel })}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-black text-primary leading-tight break-words">
              {t(greetingKey())}, {firstName}
            </h1>
            <p className="mt-2 text-sm text-secondary">{summaryText}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/board"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover shadow-sm transition"
            >
              <Plus size={16} aria-hidden="true" /> {t("dashboard.newTask")}
            </Link>
            <button
              onClick={() => void load()}
              disabled={refreshing}
              aria-label={t("dashboard.refresh")}
              className="flex items-center justify-center rounded-xl border border-border bg-app/50 p-2.5 text-muted hover:text-primary transition disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label={t("dashboard.stat.dueThisWeek")}
          value={stats.dueThisWeek}
          icon={<CalendarDays size={20} />}
          color="text-amber-500"
          bg="bg-amber-500/10 border-amber-500/20"
          href="/my-tasks"
        />
        <StatCard
          label={t("dashboard.stat.overdue")}
          value={stats.overdue}
          icon={<AlertTriangle size={20} />}
          color="text-red-500"
          bg="bg-red-500/10 border-red-500/20"
          href="/my-tasks"
        />
        <StatCard
          label={t("dashboard.stat.blocked")}
          value={stats.blocked}
          icon={<Ban size={20} />}
          color="text-rose-500"
          bg="bg-rose-500/10 border-rose-500/20"
          href="/board"
        />
        <StatCard
          label={t("dashboard.stat.inReview")}
          value={stats.inReview}
          icon={<Clock size={20} />}
          color="text-violet-500"
          bg="bg-violet-500/10 border-violet-500/20"
          href="/review"
        />
        <StatCard
          label={t("dashboard.stat.completed")}
          value={stats.completed}
          icon={<CheckCircle2 size={20} />}
          color="text-emerald-500"
          bg="bg-emerald-500/10 border-emerald-500/20"
          href="/board"
        />
      </section>

      {/* My Queue + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-label={t("dashboard.queue.title")}
          className="lg:col-span-2 rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <ListChecks size={18} aria-hidden="true" className="text-accent" />{" "}
              {t("dashboard.queue.title")}
            </h2>
            <Link
              href="/my-tasks"
              className="text-xs font-bold text-accent hover:text-accent-hover transition flex items-center gap-1"
            >
              {t("dashboard.queue.viewAll")} <ArrowRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>

          {myQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
              <p className="text-sm font-bold text-primary">{t("dashboard.queue.empty.title")}</p>
              <p className="text-xs text-muted">{t("dashboard.queue.empty.subtitle")}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {myQueue.map((task) => {
                const over = isOverdue(task.dueDate, task.status);
                return (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-border bg-app px-4 py-3 transition hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[task.status]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-muted">
                          <span>{task.code}</span>
                          <span>•</span>
                          <span>{t(STATUS_KEY[task.status])}</span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-bold ${over ? "text-red-500" : "text-muted"}`}
                      >
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-label={t("dashboard.actions.title")}
          className="rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm"
        >
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <LayoutGrid size={18} aria-hidden="true" className="text-accent" />{" "}
            {t("dashboard.actions.title")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              href="/board"
              icon={<LayoutGrid size={18} />}
              label={t("dashboard.actions.board")}
            />
            <QuickAction
              href="/my-tasks"
              icon={<ListChecks size={18} />}
              label={t("dashboard.actions.myTasks")}
            />
            <QuickAction
              href="/review"
              icon={<Clock size={18} />}
              label={t("dashboard.actions.review")}
            />
            {isLeader && (
              <QuickAction
                href="/reports"
                icon={<FileBarChart size={18} />}
                label={t("dashboard.actions.reports")}
              />
            )}
          </div>
        </section>
      </div>

      {/* Workload + Needs Attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-label={t("dashboard.workload.title")}
          className="rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <TrendingUp size={18} aria-hidden="true" className="text-accent" />{" "}
              {t("dashboard.workload.title")}
            </h2>
            <span className="text-xs font-bold text-secondary bg-app px-3 py-1 rounded-lg border border-border">
              {t("dashboard.workload.total", { count: totalCount })}
            </span>
          </div>

          <div className="space-y-5">
            {STATUSES.map((status) => {
              const count = statusCounts[status];
              const percentage = totalCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-primary">{t(STATUS_KEY[status])}</span>
                    <span className="text-xs font-bold text-secondary">{count}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-app border border-border overflow-hidden">
                    <div
                      className={`h-full ${STATUS_COLORS[status]} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          aria-label={t("dashboard.attention.title")}
          className="rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <AlertTriangle size={18} aria-hidden="true" className="text-red-500" />{" "}
              {t("dashboard.attention.title")}
            </h2>
            <Link
              href="/board"
              className="text-xs font-bold text-accent hover:text-accent-hover transition flex items-center gap-1"
            >
              {t("dashboard.attention.viewBoard")}{" "}
              <ArrowRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {urgentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
                <p className="text-sm font-bold text-primary">
                  {t("dashboard.attention.empty.title")}
                </p>
                <p className="text-xs text-muted">{t("dashboard.attention.empty.subtitle")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {urgentTasks.map((task) => {
                  const isBlocked = task.status === "BLOCKED";
                  const label = isBlocked
                    ? t("dashboard.attention.blocked")
                    : t("dashboard.attention.overdue");
                  return (
                    <li key={task.id}>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="group flex items-start gap-4 rounded-xl border border-border bg-app p-4 transition hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isBlocked ? "bg-red-500" : "bg-amber-500"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-muted">
                            <span>{task.code}</span>
                            <span>•</span>
                            <span className={isBlocked ? "text-red-500" : "text-amber-500"}>
                              {label}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Upcoming + Team Workload */}
      <div className={`grid gap-6 ${showTeamWorkload ? "lg:grid-cols-3" : ""}`}>
        <section
          aria-label={t("dashboard.upcoming.title")}
          className={`rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm ${showTeamWorkload ? "lg:col-span-2" : ""}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <CalendarDays size={18} aria-hidden="true" className="text-accent" />{" "}
              {t("dashboard.upcoming.title")}
            </h2>
            <span className="text-xs font-bold text-secondary">
              {t("dashboard.upcoming.dueCount", {
                count: upcomingByDay.reduce((a, d) => a + d.tasks.length, 0),
              })}
            </span>
          </div>

          {upcomingByDay.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Inbox size={32} className="text-muted opacity-50 mb-3" />
              <p className="text-sm font-bold text-primary">
                {t("dashboard.upcoming.empty.title")}
              </p>
              <p className="text-xs text-muted">{t("dashboard.upcoming.empty.subtitle")}</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {upcomingByDay.map((day) => {
                const shown = day.tasks.slice(0, 2);
                const rest = day.tasks.length - shown.length;
                return (
                  <li key={day.key}>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-accent">
                        {day.label}
                      </p>
                      <span className="text-[10px] font-bold text-secondary">
                        {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <span className="ms-auto text-[10px] font-bold text-secondary">
                        {day.tasks.length}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {shown.map((task) => (
                        <li key={task.id}>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="group flex items-center gap-3 rounded-lg border border-border bg-app px-3 py-2 text-sm hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_COLORS[task.status]}`}
                            />
                            <span className="flex-1 truncate text-primary group-hover:text-accent transition-colors">
                              {task.title}
                            </span>
                            <span className="shrink-0 text-[10px] font-bold text-secondary">
                              {task.priority}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {rest > 0 && (
                      <Link
                        href="/board"
                        className="mt-1 inline-block text-[11px] font-bold text-accent hover:text-accent-hover"
                      >
                        {t("dashboard.upcoming.more", {
                          count: rest,
                          day: day.label.toLowerCase(),
                        })}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {showTeamWorkload && (
          <section
            aria-label={t("dashboard.team.title")}
            className="rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm"
          >
            <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
              <Users size={18} aria-hidden="true" className="text-accent" />{" "}
              {t("dashboard.team.title")}
            </h2>
            <ul className="space-y-3">
              {teamWorkload.map((member) => (
                <li key={member.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-primary truncate">{member.name}</span>
                    <span className="text-xs font-bold text-secondary shrink-0 ms-2">
                      {member.count}
                      {member.overdue > 0 && (
                        <span className="text-red-500">
                          {" "}
                          · {t("dashboard.team.late", { count: member.overdue })}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-app overflow-hidden">
                    <div
                      className={`h-full rounded-full ${member.overdue > 0 ? "bg-red-500/70" : "bg-accent/60"}`}
                      style={{ width: `${(member.count / (teamWorkload[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-muted leading-relaxed">
              {t("dashboard.team.footnote")}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className={`text-[10px] font-extrabold uppercase tracking-wider ${color} truncate`}>
          {label}
        </p>
        <div className={`p-2 rounded-lg bg-app ${color} shrink-0`}>{icon}</div>
      </div>
      <p className="text-4xl font-black text-primary">{value}</p>
    </>
  );

  const baseClass = `rounded-2xl border bg-panel p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${bg}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClass} block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-app p-4 text-secondary hover:border-accent/50 hover:text-accent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="transition-transform group-hover:scale-110">{icon}</span>
      <span className="text-xs font-bold text-center">{label}</span>
    </Link>
  );
}
