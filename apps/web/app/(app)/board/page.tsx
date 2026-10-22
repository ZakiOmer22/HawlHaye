"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { Plus } from "lucide-react";

const STATUSES: TaskStatus[] = [
  "UNASSIGNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "COMPLETED",
];
const STATUS_META: Record<TaskStatus, { label: string; accent: string }> = {
  UNASSIGNED: { label: "Unassigned", accent: "bg-slate-400" },
  ASSIGNED: { label: "Assigned", accent: "bg-blue-400" },
  IN_PROGRESS: { label: "In progress", accent: "bg-[#e8bc69]" },
  BLOCKED: { label: "Blocked", accent: "bg-red-400" },
  REVIEW: { label: "In review", accent: "bg-violet-400" },
  COMPLETED: { label: "Completed", accent: "bg-emerald-400" },
};

const customCollisionDetection: CollisionDetection = (args) => {
  const pointerIntersections = pointerWithin(args);
  const intersections =
    pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args);
  const overId = intersections.length > 0 ? intersections[0].id : null;
  if (overId) return [{ id: overId }];
  return closestCenter(args);
};

export default function BoardPage() {
  const [columns, setColumns] = useState<Record<TaskStatus, Task[]> | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    taskId: string;
    from: TaskStatus;
    to: TaskStatus;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag to Pan State
  const boardRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadData = useCallback(async () => {
    try {
      const [u, b, o, c] = await Promise.all([
        api<{ data: User }>("/auth/me"),
        api<{ data: Record<TaskStatus, Task[]> }>("/tasks/board"),
        api<{ data: Office[] }>("/offices").catch(() => ({ data: [] })),
        api<{ data: Category[] }>("/categories").catch(() => ({ data: [] })),
      ]);
      setUser(u.data);
      setColumns(b.data);
      setOffices(o.data);
      setCategories(c.data);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const findColumn = useCallback(
    (id: string): TaskStatus | null => {
      if (!columns) return null;
      if (STATUSES.includes(id as TaskStatus)) return id as TaskStatus;
      for (const status of STATUSES) {
        if (columns[status].some((t) => t.id === id)) return status;
      }
      return null;
    },
    [columns],
  );

  const executeMove = async (taskId: string, from: TaskStatus, to: TaskStatus, reason?: string) => {
    setIsSubmitting(true);
    try {
      await api(`/tasks/${taskId}/transition`, {
        method: "POST",
        body: JSON.stringify({ to, reason }),
      });
      setPendingMove(null);
      setReasonInput("");
      void loadData();
    } catch (err) {
      setError(err instanceof ApiError ? `Move failed: ${err.message}` : "Could not move task.");
      void loadData();
      setPendingMove(null);
      setReasonInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMobileMove = (taskId: string, from: TaskStatus, to: TaskStatus) => {
    if (from === to) return;
    if (to === "BLOCKED" || (from === "REVIEW" && to === "IN_PROGRESS")) {
      setPendingMove({ taskId, from, to });
      return;
    }
    setColumns((prev) => {
      if (!prev) return prev;
      const taskToMove = prev[from].find((t) => t.id === taskId);
      if (!taskToMove) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== taskId),
        [to]: [{ ...taskToMove, status: to }, ...prev[to]],
      };
    });
    executeMove(taskId, from, to);
  };

  const onDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.type === "Task") setActiveTask(e.active.data.current.task);
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;
    if (active.data.current?.type !== "Task") return;

    setColumns((prev) => {
      if (!prev) return prev;
      const activeCol = findColumn(activeId as string);
      const overCol = findColumn(overId as string);
      if (!activeCol || !overCol) return prev;

      if (activeCol !== overCol) {
        const activeItems = prev[activeCol];
        const overItems = prev[overCol];
        const activeIndex = activeItems.findIndex((t) => t.id === activeId);
        const overIndex = overItems.findIndex((t) => t.id === overId);

        let newIndex = overItems.length;
        if (!STATUSES.includes(overId as TaskStatus)) {
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height;
          newIndex = overIndex >= 0 ? overIndex + (isBelowOverItem ? 1 : 0) : overItems.length;
        }

        return {
          ...prev,
          [activeCol]: activeItems.filter((t) => t.id !== activeId),
          [overCol]: [
            ...overItems.slice(0, newIndex),
            activeItems[activeIndex],
            ...overItems.slice(newIndex),
          ],
        };
      } else if (over.data.current?.type === "Task") {
        const items = prev[activeCol];
        const oldIndex = items.findIndex((t) => t.id === activeId);
        const newIndex = items.findIndex((t) => t.id === overId);
        if (oldIndex !== newIndex)
          return { ...prev, [activeCol]: arrayMove(items, oldIndex, newIndex) };
      }
      return prev;
    });
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);
    if (!activeCol || !overCol) return;

    if (activeCol !== overCol) {
      if (overCol === "BLOCKED" || (activeCol === "REVIEW" && overCol === "IN_PROGRESS")) {
        setPendingMove({ taskId: active.id as string, from: activeCol, to: overCol });
      } else {
        executeMove(active.id as string, activeCol, overCol);
      }
    }
  };

  const cancelMove = () => {
    if (pendingMove) void loadData();
    setPendingMove(null);
    setReasonInput("");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(".task-card") ||
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("a")
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

  if (error && !columns)
    return <div className="p-8 text-center text-red-400 font-bold text-lg">{error}</div>;
  if (!columns || !user)
    return <div className="p-8 text-center text-[#94A3B8]">Loading board...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full text-white bg-[#0F172A] p-4 md:p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            Workspace
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">Task Board</h1>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-xs text-[#94A3B8] hidden md:block">
            Click and drag the background to pan
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] shadow-[0_0_15px_rgba(232,188,105,0.2)] transition"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex-1 overflow-x-auto overflow-y-hidden pb-4 no-scrollbar ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 h-full items-start min-w-max px-2">
            {STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                label={STATUS_META[status].label}
                accent={STATUS_META[status].accent}
                tasks={columns[status] ?? []}
                onMove={(taskId, to) => {
                  const from = findColumn(taskId);
                  if (from) handleMobileMove(taskId, from, to);
                }}
              />
            ))}
          </div>
          <DragOverlay
            dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}
          >
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
        categories={categories}
        offices={offices}
      />

      {/* Reason Modal */}
      <Modal
        isOpen={!!pendingMove}
        onClose={cancelMove}
        title={pendingMove?.to === "BLOCKED" ? "Block Task" : "Return to In Progress"}
        description={
          pendingMove?.to === "BLOCKED"
            ? "Please provide a reason why this task is blocked."
            : "Please provide a comment explaining why this task is being returned."
        }
      >
        <div className="space-y-4">
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder={
              pendingMove?.to === "BLOCKED"
                ? "e.g. Waiting for vendor approval..."
                : "e.g. Missing required documentation..."
            }
            rows={4}
            className="w-full rounded-xl border border-[#334155] bg-[#0F172A] p-3 text-white outline-none focus:border-[#e8bc69]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={cancelMove}
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#94A3B8] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                pendingMove &&
                executeMove(pendingMove.taskId, pendingMove.from, pendingMove.to, reasonInput)
              }
              disabled={isSubmitting || reasonInput.trim().length < 3}
              className="rounded-lg bg-[#e8bc69] px-5 py-2 text-sm font-bold text-[#0F172A] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
