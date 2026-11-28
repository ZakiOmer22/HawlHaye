// apps/web/lib/permissions.ts
// Screen-side copy of the task rules in packages/shared/src/roles.ts. The SERVER is the real gate; this file
// only decides what to SHOW. Keep both files in step (see COORDINATORS_CAN_ASSIGN).
import type { Role } from "./types";

export const COORDINATORS_CAN_ASSIGN = false;
export const TASK_CREATOR_ROLES: readonly Role[] = ["DEAN", "DEPUTY"];

export const canCreateTasks = (role: Role): boolean => TASK_CREATOR_ROLES.includes(role);
/** Only the Dean and Deputy accept finished work or return it. */
export const canDecideReview = (role: Role): boolean => role === "DEAN" || role === "DEPUTY";
