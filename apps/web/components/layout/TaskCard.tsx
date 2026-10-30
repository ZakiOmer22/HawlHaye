"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  HIGH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  URGENT: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "REVIEW", label: "In review" },
  { value: "COMPLETED", label: "Completed" },
];

interface TaskCardProps {
  task: Task;
  onMobileMove?: (taskId: string, to: TaskStatus) => void;
}

export function TaskCard({ task, onMobileMove }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "Task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const isOverdue =
    task.dueDate && task.status !== "COMPLETED" && new Date(task.dueDate).getTime() < Date.now();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative flex flex-col rounded-xl border border-[#334155] bg-[#1E293B] p-4 shadow-sm transition-all hover:border-[#e8bc69]/50 hover:shadow-md cursor-grab active:cursor-grabbing touch-none ${
        isDragging
          ? "ring-2 ring-[#e8bc69] ring-offset-2 ring-offset-[#1E293B] z-50 opacity-50"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold tracking-wider text-[#94A3B8]">{task.code}</span>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${PRIORITY_STYLES[task.priority]}`}
          >
            {task.priority}
          </span>
          <div className="p-1 text-[#475569] group-hover:text-white transition-colors">
            <GripVertical size={14} />
          </div>
        </div>
      </div>

      <Link
        href={`/tasks/${task.id}`}
        onPointerDown={(e) => e.stopPropagation()} // Prevents drag when clicking the title
        className="block text-sm font-bold text-white line-clamp-2 hover:text-[#e8bc69] transition-colors mb-3"
      >
        {task.title}
      </Link>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#334155]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155] text-[10px] font-bold text-white">
            {task.owner?.fullName ? task.owner.fullName.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="text-[11px] font-medium text-[#94A3B8] truncate max-w-[80px]">
            {task.owner?.fullName ?? "Unassigned"}
          </span>
        </div>
        {task.dueDate && (
          <span
            className={`text-[10px] font-bold ${isOverdue ? "text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded" : "text-[#94A3B8]"}`}
          >
            {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      {/* Mobile status changer */}
      {onMobileMove && (
        <div className="mt-3 md:hidden" onPointerDown={(e) => e.stopPropagation()}>
          <select
            value={task.status}
            onChange={(e) => onMobileMove(task.id, e.target.value as TaskStatus)}
            className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-2 py-2 text-xs font-bold text-white outline-none focus:border-[#e8bc69]"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
