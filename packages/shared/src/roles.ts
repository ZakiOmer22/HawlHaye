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

export const ROLE_LABELS: Record<Role, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy Dean",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};
