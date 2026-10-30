"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { formatDate, isOverdue } from "@/lib/format";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Inbox,
  RefreshCw,
  Search,
  X,
  Plus,
} from "lucide-react";

const STATUS_KEY: Record<TaskStatus, TranslationKey> = {
  UNASSIGNED: "status.unassigned",
  ASSIGNED: "status.assigned",
  IN_PROGRESS: "status.inProgress",
  BLOCKED: "status.blocked",
  REVIEW: "status.review",
  COMPLETED: "status.completed",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  UNASSIGNED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  ASSIGNED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  BLOCKED: "bg-red-500/10 text-red-500 border-red-500/20",
  REVIEW: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

type Filter = "all" | "active" | "completed";

const FILTER_KEY: Record<Filter, TranslationKey> = {
  all: "myTasks.filter.all",
  active: "myTasks.filter.active",
  completed: "myTasks.filter.completed",
};

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function MyTasksPage() {
  const { t } = usePreferences();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<Filter>("active");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setRefreshing(true);
      try {
        const r = await api<{ data: Task[] }>("/tasks?mine=true&take=200");
        setTasks(r.data);
        setError(null);
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.code === "unauthenticated" || e.code === "session_idle") {
            setError(t("error.sessionExpired"));
            return;
          }
          if (e.code !== "password_change_required") setError(e.message);
        } else {
          setError(t("error.generic"));
        }
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Keyboard shortcut for search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = document.activeElement?.tagName ?? "";
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        document.getElementById("task-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const q = searchInput.trim().toLowerCase();

    return tasks.filter((task) => {
      if (filter === "active" && task.status === "COMPLETED") return false;
      if (filter === "completed" && task.status !== "COMPLETED") return false;

      if (q) {
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchCode = task.code.toLowerCase().includes(q);
        if (!matchTitle && !matchCode) return false;
      }

      return true;
    });
  }, [tasks, filter, searchInput]);

  // Grouping Logic (Overdue, Today, Upcoming, No Date)
  const groups = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const g: Record<string, Task[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      noDate: [],
    };

    filteredTasks.forEach((task) => {
      if (!task.dueDate) {
        g.noDate.push(task);
        return;
      }
      const due = new Date(task.dueDate);

      if (due < now) {
        g.overdue.push(task);
      } else if (isSameDay(due, now)) {
        g.today.push(task);
      } else {
        g.upcoming.push(task);
      }
    });

    Object.keys(g).forEach((key) => {
      g[key].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });

    return g;
  }, [filteredTasks]);

  const totalVisible = filteredTasks.length;

  if (error && !tasks) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 max-w-md text-center"
        >
          <AlertCircle aria-hidden="true" className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">{t("error.generic")}</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-accent-text hover:bg-accent-hover"
          >
            <RefreshCw size={16} /> {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!tasks) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
        <div className="h-10 w-48 rounded bg-panel animate-pulse" />
        <div className="rounded-2xl border border-border bg-panel overflow-hidden divide-y divide-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-5 w-5 rounded-full bg-app animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-app animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
            {t("myTasks.personalQueue")}
          </p>
          <h1 className="mt-1 text-3xl font-black text-primary">{t("myTasks.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={refreshing}
            aria-label={t("common.refresh")}
            className="flex items-center justify-center rounded-xl border border-border bg-panel p-2.5 text-muted hover:text-primary transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Link
            href="/board"
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover shadow-sm transition"
          >
            <Plus size={16} /> {t("dashboard.newTask")}
          </Link>
        </div>
      </header>

      {/* Toolbar (Search + Tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div
          role="tablist"
          className="flex items-center gap-1 bg-app p-1 rounded-xl border border-border w-fit"
        >
          {(Object.keys(FILTER_KEY) as Filter[]).map((f) => {
            const selected = filter === f;
            return (
              <button
                key={f}
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
                  selected
                    ? "bg-panel text-primary shadow-sm border border-border/50"
                    : "text-muted hover:text-primary border border-transparent"
                }`}
              >
                {t(FILTER_KEY[f])}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="task-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("myTasks.searchPlaceholder")}
            className="w-full rounded-xl border border-border bg-panel ps-9 pe-9 py-2 text-sm text-primary placeholder-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/40"
          />
          {searchInput ? (
            <button
              onClick={() => setSearchInput("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-primary"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="absolute end-2 top-1/2 -translate-y-1/2 rounded border border-border bg-app px-1.5 py-0.5 text-[10px] font-bold text-muted pointer-events-none">
              /
            </div>
          )}
        </div>
      </div>

      {/* List Content */}
      {totalVisible === 0 ? (
        <div
          role="status"
          className="rounded-3xl border border-dashed border-border bg-panel/50 p-16 text-center mt-8"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-app border border-border shadow-sm">
            <Inbox className="h-10 w-10 text-accent" />
          </div>
          <h2 className="text-2xl font-black text-primary mb-2">
            {searchInput ? t("myTasks.empty.search.title") : t("myTasks.empty.all.title")}
          </h2>
          <p className="text-sm text-muted max-w-sm mx-auto mb-6">
            {searchInput ? t("myTasks.empty.search.desc") : t("myTasks.empty.all.desc")}
          </p>
          {!searchInput && (
            <Link
              href="/board"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition"
            >
              <Plus size={16} /> {t("myTasks.empty.create")}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8 mt-6">
          {(["overdue", "today", "upcoming", "noDate"] as const).map((groupKey) => {
            const groupTasks = groups[groupKey];
            if (groupTasks.length === 0) return null;

            return (
              <div key={groupKey} className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-secondary flex items-center gap-2">
                  {groupKey === "overdue" && <AlertCircle size={14} className="text-red-500" />}
                  {groupKey === "today" && <Calendar size={14} className="text-accent" />}
                  {/* Uses the newly added translation keys */}
                  {t(`myTasks.group.${groupKey}` as TranslationKey)}
                  <span className="bg-app border border-border text-primary px-2 py-0.5 rounded-md text-[10px]">
                    {groupTasks.length}
                  </span>
                </h3>

                <div className="rounded-2xl border border-border bg-panel overflow-hidden shadow-sm divide-y divide-border">
                  {groupTasks.map((task) => {
                    const overdue = isOverdue(task.dueDate, task.status);
                    const dueText = task.dueDate ? formatDate(task.dueDate) : "";

                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-panel-hover focus:outline-none focus-visible:bg-panel-hover"
                      >
                        {/* Visual Checkbox */}
                        <div className="shrink-0 flex items-center justify-center">
                          {task.status === "COMPLETED" ? (
                            <CheckCircle2 size={20} className="text-emerald-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-border group-hover:border-accent transition-colors flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        {/* Title & Code */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={`truncate text-sm font-bold ${task.status === "COMPLETED" ? "text-muted line-through" : "text-primary group-hover:text-accent transition-colors"}`}
                            >
                              {task.title}
                            </p>
                            <span className="text-[10px] font-bold text-secondary hidden sm:inline-block">
                              {task.code}
                            </span>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 shrink-0">
                          <span
                            className={`hidden sm:inline-flex rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_STYLES[task.status]}`}
                          >
                            {t(STATUS_KEY[task.status])}
                          </span>

                          {dueText && (
                            <span
                              className={`text-xs font-bold w-20 text-end ${overdue ? "text-red-500" : "text-secondary"}`}
                            >
                              {dueText}
                            </span>
                          )}

                          <ChevronRight
                            size={16}
                            className="text-border group-hover:text-accent group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all"
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tasks.length === 200 && (
        <p className="text-xs text-center text-muted mt-8">{t("myTasks.truncationNotice")}</p>
      )}
    </div>
  );
}
