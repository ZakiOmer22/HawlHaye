export type Role =
  | "ADMINISTRATOR"
  | "DEAN"
  | "DEPUTY"
  | "FACULTY_COORDINATOR"
  | "LABS_COORDINATOR"
  | "LAB_TECHNICIAN";

export type TaskStatus =
  "UNASSIGNED" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "COMPLETED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type DelegationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  officeId: string | null;
}

export interface Category {
  id: string;
  name: string;
  color?: string | null;
  active: boolean;
}

export interface Office {
  id: string;
  name: string;
  type: "FACULTY" | "LABS" | "ADMINISTRATION";
  active: boolean;
}

export interface Task {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  blockedReason?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId?: string | null;
  officeId: string;
  categoryId: string;
  createdById: string;
  owner?: { id: string; fullName: string } | null;
  category?: { id: string; name: string; color?: string | null } | null;
  office?: { id: string; name: string } | null;
  createdBy?: { id: string; fullName: string } | null;
  assignedBy?: { id: string; fullName: string } | null;
  delegations?: Delegation[];
}

export interface TaskEvent {
  id: string;
  type: string;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string } | null;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; fullName: string };
}

export interface Delegation {
  id: string;
  status: DelegationStatus;
  reason?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  delegateId: string;
  delegatedById: string;
}
