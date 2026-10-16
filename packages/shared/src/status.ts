export const TASK_STATUSES = [
  "UNASSIGNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "COMPLETED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  REVIEW: "Review",
  COMPLETED: "Completed",
};

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Task code format: CECIT-YYYY-NNN (sequence resets each year). */
export function formatTaskCode(year: number, seq: number): string {
  return `CECIT-${year}-${String(seq).padStart(3, "0")}`;
}

/** Overdue is a computed flag, not a status. */
export function isOverdue(
  dueDate: Date | null,
  status: TaskStatus,
  now: Date = new Date(),
): boolean {
  return dueDate !== null && status !== "COMPLETED" && dueDate.getTime() < now.getTime();
}
