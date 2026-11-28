export const ROLES = [
  "DEAN",
  "DEPUTY",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
  "ADMINISTRATOR",
  "LAB_TECHNICIAN",
] as const;
export type Role = (typeof ROLES)[number];

export const LEADERSHIP_ROLES: readonly Role[] = ["DEAN", "DEPUTY"];
export const isLeadership = (role: Role): boolean => LEADERSHIP_ROLES.includes(role);

/** Coordinators may assign work inside their own reporting line (see assignable-users rules on the API). */
/**
 * ONE SWITCH for the Dean's decision on who hands out work.
 *  false (rule A, current): only the Dean and Deputy create and assign tasks.
 *  true  (rule B):          coordinators may also assign, but only inside their own reporting line.
 * Mirror this value in apps/web/lib/permissions.ts.
 */
export const COORDINATORS_CAN_ASSIGN = false;

/** Roles that may create a task (the screen and the API both use this list). */
export const TASK_CREATOR_ROLES: readonly Role[] = ["DEAN", "DEPUTY"];

export const COORDINATOR_ROLES: readonly Role[] = ["FACULTY_COORDINATOR", "LABS_COORDINATOR"];
export const isCoordinator = (role: Role): boolean => COORDINATOR_ROLES.includes(role);

export const ROLE_LABELS: Record<Role, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy Dean",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};

/** Roles that may assign a task to an officer. */
export const TASK_ASSIGNER_ROLES: readonly Role[] = COORDINATORS_CAN_ASSIGN
  ? [...LEADERSHIP_ROLES, ...COORDINATOR_ROLES]
  : LEADERSHIP_ROLES;
