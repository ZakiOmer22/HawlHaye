export const ROLES = [
  "DEAN",
  "DEPUTY",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
  "ADMINISTRATOR",
  "LAB_TECHNICIAN",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy Dean",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};

export const STATUSES = [
  "UNASSIGNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "COMPLETED",
] as const;
export type TaskStatus = (typeof STATUSES)[number];

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

export type DelegationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export interface Me {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  officeId: string | null;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  twoFAStatus?: { enforcement: "n/a" | "active" | "warning" | "blocked"; daysLeft: number | null };
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    universityName?: string | null;
  };
  permissions?: Record<string, boolean>;
}

export type LoginResult =
  | { requires2FA: true; tempToken: string }
  | { requires2FA?: false; csrfToken: string; mustChangePassword: boolean };

export interface Category {
  id: string;
  name: string;
  color?: string | null;
}
export interface Office {
  id: string;
  name: string;
  type: "FACULTY" | "LABS" | "ADMINISTRATION";
}
export interface PersonRef {
  id: string;
  fullName: string;
}

export interface Delegation {
  id: string;
  status: DelegationStatus;
  reason?: string | null;
  createdAt: string;
  delegateId: string;
  delegatedById: string;
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
  owner?: (PersonRef & { email?: string }) | null;
  category?: Category | null;
  office?: { id: string; name: string } | null;
  createdBy?: PersonRef | null;
  assignedBy?: PersonRef | null;
  delegations?: Delegation[];
}

export type Board = Record<TaskStatus, Task[]>;

export interface TaskEvent {
  id: string;
  type: string;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
  createdAt: string;
  actor?: PersonRef | null;
}
export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: PersonRef;
}
export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
export interface PendingDelegation {
  id: string;
  taskId: string;
  reason?: string | null;
  createdAt: string;
  task: Pick<Task, "id" | "code" | "title" | "priority" | "dueDate" | "status">;
  delegatedBy: PersonRef;
}
export interface UserLite {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}
export interface SearchResult {
  tasks: Pick<Task, "id" | "code" | "title" | "status">[];
  users: UserLite[];
  offices: Office[];
}
export interface Session {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}
export interface Summary {
  totalTasks: number;
  completed: number;
  completionRate: number;
  overdueTasks: number;
  dueSoonTasks: number;
  avgCompletionDays: number;
  onTimeRate: number;
  byStatus: Partial<Record<TaskStatus, number>>;
  workload: {
    id: string;
    name: string;
    total: number;
    active: number;
    blocked: number;
    review: number;
  }[];
  blockedTasks: {
    id: string;
    code: string;
    title: string;
    reason: string | null;
    days: number;
    owner: string;
  }[];
  pendingReview: { id: string; code: string; title: string; days: number; owner: string }[];
}

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export interface TicketReply {
  id: string;
  message: string;
  createdAt: string;
  author: { id: string; fullName: string; role: Role };
}
export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; fullName: string; role: Role };
  replies?: TicketReply[];
}
export interface AdminUser extends UserLite {
  officeId: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
export interface AuditRow {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string; role: Role } | null;
}
export interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  invitedBy?: { fullName: string } | null;
}
