// Mirrors packages/shared/src/workflow.ts on the server. The SERVER is the authority;
// this only decides which buttons to show.
import type { Me, Task, TaskStatus } from "../api/types";

/** Same as the server's `isLeadership` (shared/roles.ts): Dean and Deputy only. */
export const isWorkflowLeader = (me: Me) => me.role === "DEAN" || me.role === "DEPUTY";
/** Roles that see everything (and the admin screens on web). */
export const isOrgWide = (me: Me) =>
  me.role === "DEAN" || me.role === "DEPUTY" || me.role === "ADMINISTRATOR";

type Who = "leadership" | "owner";
interface Rule {
  from: TaskStatus;
  to: TaskStatus;
  who: Who[];
  label: string;
  reason: "none" | "optional" | "required";
  danger?: boolean;
}

const RULES: Rule[] = [
  { from: "ASSIGNED", to: "IN_PROGRESS", who: ["owner"], label: "Start work", reason: "none" },
  {
    from: "IN_PROGRESS",
    to: "BLOCKED",
    who: ["owner"],
    label: "Mark blocked",
    reason: "required",
    danger: true,
  },
  {
    from: "BLOCKED",
    to: "IN_PROGRESS",
    who: ["owner", "leadership"],
    label: "Resume work",
    reason: "optional",
  },
  {
    from: "IN_PROGRESS",
    to: "REVIEW",
    who: ["owner"],
    label: "Submit for review",
    reason: "optional",
  },
  {
    from: "REVIEW",
    to: "COMPLETED",
    who: ["leadership"],
    label: "Accept & complete",
    reason: "optional",
  },
  {
    from: "REVIEW",
    to: "IN_PROGRESS",
    who: ["leadership"],
    label: "Return for changes",
    reason: "required",
    danger: true,
  },
  {
    from: "ASSIGNED",
    to: "UNASSIGNED",
    who: ["leadership"],
    label: "Unassign",
    reason: "required",
    danger: true,
  },
  {
    from: "IN_PROGRESS",
    to: "UNASSIGNED",
    who: ["leadership"],
    label: "Unassign",
    reason: "required",
    danger: true,
  },
  {
    from: "BLOCKED",
    to: "UNASSIGNED",
    who: ["leadership"],
    label: "Unassign",
    reason: "required",
    danger: true,
  },
];

export interface Move {
  to: TaskStatus;
  label: string;
  reason: Rule["reason"];
  danger: boolean;
}

export function availableMoves(me: Me, task: Pick<Task, "status" | "ownerId">): Move[] {
  return RULES.filter((r) => r.from === task.status)
    .filter((r) =>
      r.who.some((w) => (w === "leadership" ? isWorkflowLeader(me) : task.ownerId === me.id)),
    )
    .map((r) => ({ to: r.to, label: r.label, reason: r.reason, danger: !!r.danger }));
}

/** UNASSIGNED -> ASSIGNED goes through POST /tasks/:id/assign (Dean / Deputy). */
export const canAssign = (me: Me, task: Pick<Task, "status">) =>
  isWorkflowLeader(me) && task.status === "UNASSIGNED";

/** The API only lets the CURRENT OWNER delegate (service.delegateTask). */
export const canDelegate = (me: Me, task: Pick<Task, "status" | "ownerId">) =>
  task.ownerId === me.id && task.status !== "COMPLETED";

/** Web hides creation for technicians; the server does not enforce it (see review). */
export const canCreateTask = (me: Me) => me.role !== "LAB_TECHNICIAN";

export const canDeleteTask = (me: Me) => me.role === "DEAN" || me.role === "ADMINISTRATOR";

export const canSeeReports = (me: Me) => me.role !== "LAB_TECHNICIAN"; // server: reports router allows all but technicians
