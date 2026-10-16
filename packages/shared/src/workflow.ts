import { isLeadership, type Role } from "./roles";
import type { TaskStatus } from "./status";

export interface Actor {
  id: string;
  role: Role;
}
export interface TaskRef {
  status: TaskStatus;
  ownerId: string | null;
  delegateId: string | null;
}
type Who = "leadership" | "owner" | "delegate";

interface Rule {
  from: TaskStatus;
  to: TaskStatus;
  who: Who[];
  note: string;
}

/** Single source of truth for the Kanban workflow. Enforced on the SERVER; the UI only mirrors it. */
export const TRANSITIONS: readonly Rule[] = [
  {
    from: "UNASSIGNED",
    to: "ASSIGNED",
    who: ["leadership"],
    note: "Needs owner, priority, due date",
  },
  { from: "ASSIGNED", to: "IN_PROGRESS", who: ["owner", "delegate"], note: "Work started" },
  { from: "IN_PROGRESS", to: "BLOCKED", who: ["owner", "delegate"], note: "Reason required" },
  { from: "BLOCKED", to: "IN_PROGRESS", who: ["owner", "leadership"], note: "Resolution note" },
  { from: "IN_PROGRESS", to: "REVIEW", who: ["owner"], note: "Completion note" },
  { from: "REVIEW", to: "COMPLETED", who: ["leadership"], note: "Dean or Deputy accepts" },
  { from: "REVIEW", to: "IN_PROGRESS", who: ["leadership"], note: "Return with comment" },
  { from: "ASSIGNED", to: "UNASSIGNED", who: ["leadership"], note: "Reassign, reason required" },
  { from: "IN_PROGRESS", to: "UNASSIGNED", who: ["leadership"], note: "Reassign, reason required" },
  { from: "BLOCKED", to: "UNASSIGNED", who: ["leadership"], note: "Reassign, reason required" },
];

export type TransitionResult = { ok: true } | { ok: false; reason: string };

export function canTransition(actor: Actor, task: TaskRef, to: TaskStatus): TransitionResult {
  const rule = TRANSITIONS.find((r) => r.from === task.status && r.to === to);
  if (!rule) return { ok: false, reason: `Cannot move from ${task.status} to ${to}` };

  const allowed = rule.who.some((w) => {
    if (w === "leadership") return isLeadership(actor.role);
    if (w === "owner") return task.ownerId === actor.id;
    return task.delegateId === actor.id;
  });
  return allowed ? { ok: true } : { ok: false, reason: "You are not allowed to make this move" };
}
