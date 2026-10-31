"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  type CollisionDetection,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskStatus, User, Office, Category } from "@/lib/types";
import { Column } from "@/components/layout/Column";
import { TaskCard } from "@/components/layout/TaskCard";
import { Modal } from "@/components/ui/Modal";
import { CreateTaskModal } from "@/components/board/CreateTaskModal";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import { useBoardRealtime } from "@/lib/realtime";
import {
  Plus,
  Search,
  X,
  RefreshCw,
  Calendar,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  CalendarDays,
  Layers,
} from "lucide-react";

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

const STATUS_STYLE: Record<
  TaskStatus,
  { accent: string; bg: string; text: string; border: string }
> = {
  UNASSIGNED: { accent: "bg-slate-400", bg: "bg-slate-400/10", text: "text-slate-500", border: "border-slate-400/20" },
  ASSIGNED: { accent: "bg-blue-400", bg: "bg-blue-400/10", text: "text-blue-500", border: "border-blue-400/20" },
  IN_PROGRESS: { accent: "bg-accent", bg: "bg-accent/10", text: "text-accent", border: "border-accent/20" },
  BLOCKED: { accent: "bg-red-400", bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
  REVIEW: { accent: "bg-violet-400", bg: "bg-violet-400/10", text: "text-violet-500", border: "border-violet-400/20" },
  COMPLETED: { accent: "bg-emerald-400", bg: "bg-emerald-400/10", text: "text-emerald-500", border: "border-emerald-400/20" },
};

type BoardColumnPayload = Task[] | { tasks: Task[]; total: number };
type BoardRaw = Partial<Record<TaskStatus, BoardColumnPayload>>;
type DateFilter = "ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "NEXT_TWO_WEEKS" | "THIS_MONTH";
type ViewMode = "board" | "list" | "calendar";

const DATE_FILTER_KEY: Record<DateFilter, TranslationKey> = {
  ALL: "board.filter.anyDate",
  OVERDUE: "board.filter.overdue",
  TODAY: "board.filter.today",
  THIS_WEEK: "board.filter.thisWeek",
  NEXT_TWO_WEEKS: "board.filter.nextTwoWeeks",
  THIS_MONTH: "board.filter.thisMonth",
};

const DAY_KEYS: TranslationKey[] = [
  "board.day.sun",
  "board.day.mon",
  "board.day.tue",
  "board.day.wed",
  "board.day.thu",
  "board.day.fri",
  "board.day.sat",
];

function isColumnPayload(value: unknown): value is { tasks: Task[]; total: number } {
  if (typeof value !== "object" || value === null) return false;
  if (!("tasks" in value)) return false;
  const maybe = value as { tasks: unknown };
  return Array.isArray(maybe.tasks);
}

function normalizeBoard(raw: BoardRaw | undefined): {
  tasks: Record<TaskStatus, Task[]>;
  totals: Record<TaskStatus, number>;
} {
  const tasks: Record<TaskStatus, Task[]> = {
    UNASSIGNED: [], ASSIGNED: [], IN_PROGRESS: [], BLOCKED: [], REVIEW: [], COMPLETED: [],
  };
  const totals: Record<TaskStatus, number> = {
    UNASSIGNED: 0, ASSIGNED: 0, IN_PROGRESS: 0, BLOCKED: 0, REVIEW: 0, COMPLETED: 0,
  };
  if (!raw) return { tasks, totals };
  for (const status of STATUSES) {
    const value = raw[status];
    if (Array.isArray(value)) {
      tasks[status] = value;
      totals[status] = value.length;
    } else if (isColumnPayload(value)) {
      tasks[status] = value.tasks;
      totals[status] = typeof value.total === "number" ? value.total : value.tasks.length;
    }
  }
  return { tasks, totals };
}

const customCollisionDetection: CollisionDetection = (args) => {
  const pointerIntersections = pointerWithin(args);
  const intersections = pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
  const overId = intersections.length > 0 ? intersections[0].id : null;
  if (overId) return [{ id: overId }];
  return closestCenter(args);
};

export default function BoardPage() {
  const { t } = usePreferences();

  // ─────────────────────────────────────────────────────────────
  // Detect mobile so drag-and-drop can be disabled
  // ─────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  // ─────────────────────────────────────────────────────────────

  const [columns, setColumns] = useState<Record<TaskStatus, Task[]> | null>(null);
  const [totals, setTotals] = useState<Record<TaskStatus, number>>({
    UNASSIGNED: 0, ASSIGNED: 0, IN_PROGRESS: 0, BLOCKED: 0, REVIEW: 0, COMPLETED: 0,
  });
  const [user, setUser] = useState<User | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [searchInput, setSearchInput] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterMine, setFilterMine] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<DateFilter>("ALL");
  const [showDateMenu, setShowDateMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [announcement, setAnnouncement] = useState("");

  const [dragOrigin, setDragOrigin] = useState<TaskStatus | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    taskId: string;
    from: TaskStatus;
    to: TaskStatus;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const pendingMoveRef = useRef(pendingMove);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: isMobile ? 100_000 : 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: isMobile ? 100_000 : 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    pendingMoveRef.current = pendingMove;
  }, [pendingMove]);

  useEffect(() => {
    const tmr = setTimeout(() => setFilterSearch(searchInput.trim()), 400);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  useEffect(() => {
    if (pendingMove) {
      const tmr = setTimeout(() => reasonRef.current?.focus(), 50);
      return () => clearTimeout(tmr);
    }
  }, [pendingMove]);

  useEffect(() => {
    if (!showDateMenu) return;
    const onClick = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node))
        setShowDateMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showDateMenu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (filterMine) params.set("mine", "true");
        if (filterSearch) params.set("q", filterSearch);
        if (filterCategory) params.set("categoryId", filterCategory);
        if (filterDate === "OVERDUE") params.set("overdue", "true");

        const qs = params.toString();
        const boardPath = qs ? `/tasks/board?${qs}` : "/tasks/board";

        const [u, b, o, c] = await Promise.all([
          api<{ data: User }>("/auth/me"),
          api<{ data: BoardRaw }>(boardPath),
          api<{ data: Office[] }>("/offices").catch(() => ({ data: [] as Office[] })),
          api<{ data: Category[] }>("/categories").catch(() => ({ data: [] as Category[] })),
        ]);

        const { tasks, totals: nextTotals } = normalizeBoard(b.data);

        if (["TODAY", "THIS_WEEK", "NEXT_TWO_WEEKS", "THIS_MONTH"].includes(filterDate)) {
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000;
          const endOfTwoWeeks = startOfToday + 14 * 24 * 60 * 60 * 1000;
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

          const filterByDate = (task: Task) => {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate).getTime();
            if (filterDate === "TODAY") return due >= startOfToday && due < startOfToday + 86400000;
            if (filterDate === "THIS_WEEK") return due >= startOfToday && due < endOfWeek;
            if (filterDate === "NEXT_TWO_WEEKS") return due >= startOfToday && due < endOfTwoWeeks;
            if (filterDate === "THIS_MONTH") return due >= startOfToday && due <= endOfMonth;
            return true;
          };

          for (const status of STATUSES) {
            tasks[status] = tasks[status].filter(filterByDate);
            nextTotals[status] = tasks[status].length;
          }
        }

        setUser(u.data);
        setColumns(tasks);
        setTotals(nextTotals);
        setOffices(o.data);
        setCategories(c.data);
        setError(null);

        const total = Object.values(nextTotals).reduce((a, b) => a + b, 0);
        setAnnouncement(t("board.announce.loaded", { count: total }));
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t("board.loadError");
        setError(msg);
        setAnnouncement(`Error: ${msg}`);
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [filterMine, filterSearch, filterCategory, filterDate, t],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useBoardRealtime(() => {
    void loadData({ silent: true });
  });

  const displayColumns = useMemo(() => {
    if (!columns) return null;
    if (!filterSearch) return columns;
    const q = filterSearch.toLowerCase();
    const result: Record<TaskStatus, Task[]> = {
      UNASSIGNED: [], ASSIGNED: [], IN_PROGRESS: [], BLOCKED: [], REVIEW: [], COMPLETED: [],
    };
    for (const status of STATUSES) {
      result[status] = columns[status].filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.code.toLowerCase().includes(q) ||
          (task.description ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [columns, filterSearch]);

  const displayTotals = useMemo(() => {
    if (!displayColumns) return totals;
    const result = { ...totals };
    for (const status of STATUSES) result[status] = Math.max(displayColumns[status].length, 0);
    return result;
  }, [displayColumns, totals]);

  const allTasks = useMemo(() => {
    if (!displayColumns) return [];
    return Object.values(displayColumns).flat();
  }, [displayColumns]);

  const findColumn = useCallback(
    (id: string): TaskStatus | null => {
      if (!columns) return null;
      if (STATUSES.includes(id as TaskStatus)) return id as TaskStatus;
      for (const status of STATUSES) {
        if (columns[status].some((task) => task.id === id)) return status;
      }
      return null;
    },
    [columns],
  );

  const executeMove = useCallback(
    async (taskId: string, from: TaskStatus, to: TaskStatus, reason?: string) => {
      setIsSubmitting(true);
      try {
        await api(`/tasks/${taskId}/transition`, {
          method: "POST",
          body: JSON.stringify({ to, reason }),
        });
        setAnnouncement(t("board.announce.moved", { status: t(STATUS_KEY[to]) }));
        setPendingMove(null);
        setReasonInput("");
        void loadData({ silent: true });
      } catch (err) {
        const msg = err instanceof ApiError ? `Move failed: ${err.message}` : "Could not move task.";
        setError(msg);
        setAnnouncement(`Error: ${msg}`);
        void loadData({ silent: true });
        setPendingMove(null);
        setReasonInput("");
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadData, t],
  );

  const handleMobileMove = useCallback(
    (taskId: string, from: TaskStatus, to: TaskStatus) => {
      if (from === to) return;
      if (to === "BLOCKED" || (from === "REVIEW" && to === "IN_PROGRESS")) {
        setPendingMove({ taskId, from, to });
        return;
      }
      setColumns((prev) => {
        if (!prev) return prev;
        const taskToMove = prev[from].find((task) => task.id === taskId);
        if (!taskToMove) return prev;
        return {
          ...prev,
          [from]: prev[from].filter((task) => task.id !== taskId),
          [to]: [{ ...taskToMove, status: to }, ...prev[to]],
        };
      });
      void executeMove(taskId, from, to);
    },
    [executeMove],
  );

  const handleColumnMove = useCallback(
    (taskId: string, to: TaskStatus) => {
      const from = findColumn(taskId);
      if (from) handleMobileMove(taskId, from, to);
    },
    [findColumn, handleMobileMove],
  );

  const cancelMove = useCallback(() => {
    if (pendingMoveRef.current) void loadData({ silent: true });
    setPendingMove(null);
    setReasonInput("");
    setAnnouncement(t("board.announce.cancelled"));
  }, [loadData, t]);

  const clearFilters = useCallback(() => {
    setFilterMine(false);
    setFilterCategory(null);
    setFilterDate("ALL");
    setSearchInput("");
    setFilterSearch("");
    setAnnouncement(t("board.announce.cleared"));
  }, [t]);

  const onDragStart = (e: DragStartEvent) => {
    if (isMobile) return;
    if (e.active.data.current?.type === "Task") {
      const task = e.active.data.current.task as Task;
      setActiveTask(task);
      setDragOrigin(findColumn(e.active.id as string));
      setAnnouncement(t("board.announce.pickedUp", { title: task.title }));
    }
  };

  const onDragOver = (e: DragOverEvent) => {
    if (isMobile) return;
    const { active, over } = e;
    if (!over || active.id === over.id || active.data.current?.type !== "Task") return;
    setColumns((prev) => {
      if (!prev) return prev;
      const activeCol = findColumn(active.id as string);
      const overCol = findColumn(over.id as string);
      if (!activeCol || !overCol) return prev;

      if (activeCol !== overCol) {
        const activeItems = prev[activeCol];
        const overItems = prev[overCol];
        const activeIndex = activeItems.findIndex((task) => task.id === active.id);
        const overIndex = overItems.findIndex((task) => task.id === over.id);

        let newIndex = overItems.length;
        if (!STATUSES.includes(over.id as TaskStatus)) {
          const isBelowOverItem =
            over && active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;
          newIndex = overIndex >= 0 ? overIndex + (isBelowOverItem ? 1 : 0) : overItems.length;
        }

        return {
          ...prev,
          [activeCol]: activeItems.filter((task) => task.id !== active.id),
          [overCol]: [
            ...overItems.slice(0, newIndex),
            activeItems[activeIndex],
            ...overItems.slice(newIndex),
          ],
        };
      } else if (over.data.current?.type === "Task") {
        const items = prev[activeCol];
        const oldIndex = items.findIndex((task) => task.id === active.id);
        const newIndex = items.findIndex((task) => task.id === over.id);
        if (oldIndex !== newIndex)
          return { ...prev, [activeCol]: arrayMove(items, oldIndex, newIndex) };
      }
      return prev;
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (isMobile) return;
    setActiveTask(null);
    const { active, over } = e;
    const from = dragOrigin;
    setDragOrigin(null);

    if (!over || !from) {
      void loadData({ silent: true });
      return;
    }
    const overCol = findColumn(over.id as string);
    if (!overCol) {
      void loadData({ silent: true });
      return;
    }

    if (from !== overCol) {
      if (overCol === "BLOCKED" || (from === "REVIEW" && overCol === "IN_PROGRESS")) {
        setPendingMove({ taskId: active.id as string, from, to: overCol });
        setAnnouncement(t("board.announce.reason"));
      } else {
        void executeMove(active.id as string, from, overCol);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(".task-card") ||
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("a") ||
      (e.target as HTMLElement).closest("input") ||
      (e.target as HTMLElement).closest("select") ||
      (e.target as HTMLElement).closest("textarea")
    )
      return;
    setIsPanning(true);
    setStartX(e.pageX - (boardRef.current?.offsetLeft || 0));
    setScrollLeft(boardRef.current?.scrollLeft || 0);
  };
  const handleMouseLeave = () => setIsPanning(false);
  const handleMouseUp = () => setIsPanning(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !boardRef.current) return;
    e.preventDefault();
    const x = e.pageX - (boardRef.current.offsetLeft || 0);
    boardRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
  };

  const anyFilterActive =
    filterMine || filterCategory !== null || filterDate !== "ALL" || filterSearch !== "";

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const currentMonthName = calendarDate.toLocaleString("default", { month: "long" });
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (!task.dueDate) return false;
      const d = new Date(task.dueDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [allTasks, currentYear, currentMonth]);

  const handlePrevMonth = () => setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(currentYear, currentMonth + 1, 1));

  if (!displayColumns || !user) {
    if (error) {
      return (
        <div className="-mx-4 -my-6 flex flex-1 min-h-0 w-full flex-col items-center justify-center bg-app p-4 md:p-6">
          <div role="alert" className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-lg font-black text-red-400 mb-2">{t("board.loadError")}</p>
            <p className="text-sm text-muted mb-6">{error}</p>
            <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover">
              <RefreshCw size={16} /> {t("board.retry")}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="-mx-4 -my-6 flex flex-1 min-h-0 w-full flex-col bg-app p-4 md:p-6" aria-busy="true">
        <div className="mb-6 shrink-0 flex justify-between">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-panel-hover animate-pulse" />
            <div className="h-8 w-64 rounded bg-panel-hover animate-pulse" />
          </div>
          <div className="h-10 w-28 rounded bg-panel-hover animate-pulse" />
        </div>
        <div className="flex gap-4 flex-1 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-[320px] shrink-0 rounded-2xl border border-border bg-panel/40 p-4">
              <div className="h-4 w-24 rounded bg-panel-hover mb-4 animate-pulse" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="mb-3 h-28 rounded-xl bg-app border border-border/60 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalCount = Object.values(displayTotals).reduce((a, b) => a + b, 0);
  const taskCountLabel = totalCount === 1 ? t("board.taskCountOne", { count: totalCount }) : t("board.taskCount", { count: totalCount });

  return (
    <div className="-mx-4 -my-6 flex flex-1 min-h-0 w-full flex-col bg-app text-primary overflow-hidden">
      <div className="sr-only" aria-live="polite">{announcement}</div>

      <div className="border-b border-border bg-app/95 backdrop-blur-md px-4 pt-6 pb-4 md:px-6 shrink-0 z-20">
        <div className="flex flex-col gap-5 max-w-[1600px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 data-tour="board-title" className="text-2xl font-black text-primary tracking-tight">{t("board.title")}</h1>
                <span className="rounded-full bg-panel border border-border px-2.5 py-0.5 text-xs font-bold text-muted">{taskCountLabel}</span>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </div>
              </div>
              <p className="text-sm text-muted mt-1">{t("board.subtitle")}</p>
            </div>

            <div className="flex items-center gap-2">
              <div data-tour="view-switcher" className="flex items-center rounded-xl border border-border bg-panel p-1 me-2">
                <button onClick={() => setViewMode("board")} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${viewMode === "board" ? "bg-app text-primary shadow-sm" : "text-muted hover:text-primary"}`}>
                  <LayoutGrid size={14} /> {t("board.view.board")}
                </button>
                <button onClick={() => setViewMode("list")} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${viewMode === "list" ? "bg-app text-primary shadow-sm" : "text-muted hover:text-primary"}`}>
                  <List size={14} /> {t("board.view.list")}
                </button>
                <button onClick={() => setViewMode("calendar")} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${viewMode === "calendar" ? "bg-app text-primary shadow-sm" : "text-muted hover:text-primary"}`}>
                  <CalendarDays size={14} /> {t("board.view.calendar")}
                </button>
              </div>

              <button onClick={() => void loadData()} disabled={refreshing} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel text-muted hover:text-primary transition disabled:opacity-50">
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button data-tour="new-task" onClick={() => setIsCreateOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-accent-text hover:bg-accent-hover shadow-sm transition">
                <Plus size={16} /> {t("board.newTask")}
              </button>
            </div>
          </div>

          <div data-tour="filters" className="flex flex-wrap items-center gap-2">
            <div data-tour="search" className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input ref={searchRef} type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("board.searchPlaceholder")} className="w-full h-10 rounded-xl border border-border bg-panel ps-9 pe-9 text-sm text-primary placeholder-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/40" />
              {searchInput && (
                <button onClick={() => setSearchInput("")} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-primary">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="relative" ref={dateMenuRef}>
              <button onClick={() => setShowDateMenu(!showDateMenu)} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${filterDate !== "ALL" ? "border-accent bg-accent/10 text-accent" : "border-border bg-panel text-muted hover:text-primary"}`}>
                <Calendar size={15} />
                <span>{t(DATE_FILTER_KEY[filterDate])}</span>
                <ChevronDown size={14} className={`transition-transform ${showDateMenu ? "rotate-180" : ""}`} />
              </button>

              {showDateMenu && (
                <div className="absolute top-12 start-0 z-50 w-52 rounded-xl border border-border bg-panel p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2">
                  {(["ALL", "OVERDUE", "TODAY", "THIS_WEEK", "NEXT_TWO_WEEKS", "THIS_MONTH"] as DateFilter[]).map((opt) => (
                    <button key={opt} onClick={() => { setFilterDate(opt); setShowDateMenu(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${filterDate === opt ? "bg-accent/10 text-accent" : "text-secondary hover:bg-app hover:text-primary"}`}>
                      {t(DATE_FILTER_KEY[opt])}
                      {filterDate === opt && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setFilterMine(!filterMine)} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${filterMine ? "border-accent bg-accent/10 text-accent" : "border-border bg-panel text-muted hover:text-primary"}`}>
              <UserCircle2 size={16} /> {t("board.filter.mine")}
            </button>

            {anyFilterActive && (
              <button onClick={clearFilters} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold text-muted hover:text-primary transition">
                <X size={14} /> {t("board.filter.clear")}
              </button>
            )}

            {categories.length > 0 && <div className="h-6 w-px bg-border mx-1 hidden sm:block" />}

            <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {categories.map((cat) => {
                const isSelected = filterCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => setFilterCategory(isSelected ? null : cat.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${isSelected ? "border-accent bg-accent text-accent-text shadow-sm" : "border-border bg-panel text-muted hover:border-accent/50 hover:text-primary"}`}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color || "#64748B" }} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {totalCount === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-panel border border-border shadow-sm mb-6">
              <Layers className="h-10 w-10 text-muted" />
            </div>
            <h2 className="text-2xl font-black text-primary mb-2">{t("board.empty.title")}</h2>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">{anyFilterActive ? t("board.empty.withFilters") : t("board.empty.noTasks")}</p>
            {anyFilterActive ? (
              <button onClick={clearFilters} className="rounded-xl border border-border bg-panel px-5 py-2.5 text-sm font-bold text-primary hover:border-accent transition">{t("board.empty.clearFilters")}</button>
            ) : (
              <button onClick={() => setIsCreateOpen(true)} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition">{t("board.empty.createFirst")}</button>
            )}
          </div>
        ) : viewMode === "board" ? (
          <div
            id="board-region"
            ref={boardRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            aria-label={t("a11y.boardDescription")}
            className={`h-full w-full overflow-auto p-4 md:p-6 no-scrollbar ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={customCollisionDetection}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              <div data-tour="columns" role="list" className="flex gap-5 items-start min-w-max pb-4 h-full">
                {STATUSES.map((status) => {
                  const shown = displayColumns[status]?.length ?? 0;
                  const total = displayTotals[status] ?? shown;
                  const statusLabel = t(STATUS_KEY[status]);
                  const label = total > shown ? `${statusLabel} (${shown}/${total})` : statusLabel;
                  return (
                    <div key={status} role="listitem" className="flex-shrink-0 w-[320px] flex flex-col max-h-full">
                      <Column
                        status={status}
                        label={label}
                        accent={STATUS_STYLE[status].accent}
                        tasks={displayColumns[status] ?? []}
                        onMove={handleColumnMove}
                      />
                    </div>
                  );
                })}
              </div>
              <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
                {activeTask ? <TaskCard task={activeTask} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : viewMode === "list" ? (
          <div className="h-full w-full overflow-auto p-4 md:p-6 no-scrollbar">
            <div className="rounded-xl border border-border bg-panel overflow-hidden">
              <table className="w-full text-start text-sm">
                <thead className="bg-app-soft/50 border-b border-border text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-6 py-4 font-bold text-start">{t("board.table.task")}</th>
                    <th className="px-6 py-4 font-bold text-start">{t("board.table.status")}</th>
                    <th className="px-6 py-4 font-bold text-start">{t("board.table.category")}</th>
                    <th className="px-6 py-4 font-bold text-start">{t("board.table.dueDate")}</th>
                    <th className="px-6 py-4 font-bold text-start">{t("board.table.assignee")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-panel-hover transition group cursor-pointer" onClick={() => (window.location.href = `/tasks/${task.id}`)}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-primary group-hover:text-accent transition-colors">{task.title}</p>
                        <p className="text-xs text-muted mt-0.5">{task.code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[task.status].bg} ${STATUS_STYLE[task.status].text} ${STATUS_STYLE[task.status].border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[task.status].accent}`} />
                          {t(STATUS_KEY[task.status])}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted">{task.category?.name || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED" ? "text-red-500" : "text-muted"}`}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-app-soft flex items-center justify-center text-[10px] font-bold text-muted border border-border">
                            {task.owner?.fullName.charAt(0).toUpperCase() || "U"}
                          </div>
                          <span className="text-muted text-xs font-medium">{task.owner?.fullName || t("board.table.unassigned")}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-full w-full overflow-auto p-4 md:p-6 no-scrollbar">
            <div className="rounded-xl border border-border bg-panel overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-border flex items-center justify-between bg-app-soft/30 shrink-0">
                <h2 className="text-lg font-black text-primary">{currentMonthName} {currentYear}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevMonth} className="p-1.5 rounded-lg border border-border bg-panel text-muted hover:text-primary transition"><ChevronLeft size={18} className="rtl:rotate-180" /></button>
                  <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1.5 rounded-lg border border-border bg-panel text-xs font-bold text-muted hover:text-primary transition">{t("board.calendar.today")}</button>
                  <button onClick={handleNextMonth} className="p-1.5 rounded-lg border border-border bg-panel text-muted hover:text-primary transition"><ChevronRight size={18} className="rtl:rotate-180" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {monthTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <CalendarDays className="h-12 w-12 text-muted opacity-50 mb-4" />
                    <p className="text-lg font-bold text-primary">{t("board.calendar.noTasks")}</p>
                    <p className="text-sm text-muted mt-1 max-w-sm">{t("board.calendar.noTasksHint", { month: currentMonthName, year: currentYear })}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
                    {DAY_KEYS.map((key) => (
                      <div key={key} className="p-2 text-center text-xs font-bold text-muted uppercase tracking-wider border-b border-border sticky top-0 bg-panel z-10">{t(key)}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="border-b border-e border-border bg-app-soft/20 opacity-50" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = new Date(currentYear, currentMonth, dayNum).toDateString();
                      const dayTasks = allTasks.filter((task) => task.dueDate && new Date(task.dueDate).toDateString() === dateStr);
                      const isToday = dayNum === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                      return (
                        <div key={dayNum} className="border-b border-e border-border p-2 overflow-y-auto no-scrollbar hover:bg-app-soft/10 transition">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-bold ${isToday ? "bg-accent text-accent-text h-5 w-5 rounded-full flex items-center justify-center" : "text-muted"}`}>{dayNum}</span>
                            {dayTasks.length > 0 && <span className="text-[10px] font-bold text-muted">{dayTasks.length}</span>}
                          </div>
                          <div className="space-y-1">
                            {dayTasks.map((task) => (
                              <div key={task.id} onClick={() => (window.location.href = `/tasks/${task.id}`)} className={`cursor-pointer truncate rounded px-1.5 py-1 text-[10px] font-bold border-s-2 ${STATUS_STYLE[task.status].bg} ${STATUS_STYLE[task.status].text}`} style={{ borderInlineStartColor: "currentColor" }}>{task.title}</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateTaskModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => void loadData({ silent: true })} categories={categories} offices={offices} />

      <Modal isOpen={!!pendingMove} onClose={cancelMove} title={pendingMove?.to === "BLOCKED" ? t("board.modal.blockTitle") : t("board.modal.returnTitle")} description={pendingMove?.to === "BLOCKED" ? t("board.modal.blockDesc") : t("board.modal.returnDesc")}>
        <div className="space-y-4">
          <textarea ref={reasonRef} value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} rows={4} placeholder={t("board.modal.reasonPlaceholder")} className="w-full rounded-xl border border-border bg-app p-3 text-primary outline-none transition focus:border-accent" />
          <div className="flex justify-end gap-2">
            <button onClick={cancelMove} className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary">{t("common.cancel")}</button>
            <button onClick={() => pendingMove && executeMove(pendingMove.taskId, pendingMove.from, pendingMove.to, reasonInput)} disabled={isSubmitting || reasonInput.trim().length < 3} className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-accent-text disabled:opacity-50">
              {isSubmitting ? t("board.modal.saving") : t("common.confirm")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
