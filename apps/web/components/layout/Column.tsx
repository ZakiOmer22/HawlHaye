"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: Task[];
  onMove: (taskId: string, to: TaskStatus) => void;
}

export function Column({ status, label, accent, tasks, onMove }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "Column", status } });

  return (
    <div
      ref={setNodeRef}
      // Changed to min-w-[220px] so 6 columns fit on a 1080p screen perfectly
      className={`flex flex-col w-full min-w-[240px] max-w-[340px] rounded-2xl border bg-[#1E293B] transition-colors ${
        isOver
          ? "border-[#e8bc69]/60 bg-[#1E293B]/80 shadow-[0_0_20px_rgba(232,188,105,0.1)]"
          : "border-[#334155]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#334155] px-4 py-4 rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">{label}</h2>
        </div>
        <span className="rounded-md bg-[#0F172A] border border-[#334155] px-2.5 py-1 text-xs font-bold text-[#94A3B8]">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div
              className={`flex h-28 items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                isOver ? "border-[#e8bc69]/50 bg-[#e8bc69]/5" : "border-[#334155] text-[#475569]"
              } text-sm font-medium`}
            >
              Drop tasks here
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} onMobileMove={onMove} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}
