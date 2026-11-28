import { data, request } from "./client";
import type {
  AdminUser,
  AuditRow,
  PendingInvite,
  Ticket,
  TicketStatus,
  Role,
  Attachment,
  Board,
  Category,
  Comment,
  LoginResult,
  Me,
  Office,
  PendingDelegation,
  Priority,
  SearchResult,
  Session,
  Summary,
  Task,
  TaskEvent,
  TaskStatus,
  UserLite,
} from "./types";

export const Api = {
  // ── Auth ────────────────────────────────────────────────
  login: (email: string, password: string) =>
    data<LoginResult>("/auth/login", { method: "POST", body: { email, password } }),
  authenticate2FA: (tempToken: string, code: string, isBackupCode: boolean) =>
    data<{ csrfToken: string; mustChangePassword: boolean }>("/auth/2fa/authenticate", {
      method: "POST",
      body: { tempToken, code, isBackupCode },
    }),
  /** The web's accept-invite page posts here and then sends the user to /login. */
  acceptInviteWeb: (token: string, password: string) =>
    request<unknown>("/users/invite/accept", { method: "POST", body: { token, password } }),
  me: () => data<Me>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) =>
    request<void>("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token: string, password: string) =>
    request<void>("/auth/reset-password", { method: "POST", body: { token, password } }),
  acceptInvite: (token: string, password: string, fullName?: string) =>
    data<{ csrfToken: string }>("/auth/invite/accept", {
      method: "POST",
      body: { token, password, ...(fullName ? { fullName } : {}) },
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
  sessions: () => data<Session[]>("/auth/sessions"),
  revokeSession: (id: string) => request<void>(`/auth/sessions/${id}`, { method: "DELETE" }),
  twoFASetup: (password: string) =>
    data<{ secret: string; qrCodeUrl: string }>("/auth/2fa/setup", {
      method: "POST",
      body: { password },
    }),
  twoFAVerify: (token: string) =>
    data<{ success: boolean; backupCodes: string[] }>("/auth/2fa/verify", {
      method: "POST",
      body: { token },
    }),
  twoFADisable: (password: string) =>
    data<{ success: boolean }>("/auth/2fa/disable", { method: "POST", body: { password } }),
  backupCodesRemaining: () => data<{ remaining: number; total: number }>("/auth/2fa/backup-codes"),

  // ── Reference data ──────────────────────────────────────
  offices: () => data<Office[]>("/offices"),
  categories: () => data<Category[]>("/categories"),
  users: () => data<UserLite[]>("/users"), // Dean / Deputy / Administrator only
  search: (q: string) => data<SearchResult>(`/search?q=${encodeURIComponent(q)}`),

  // ── Tasks ───────────────────────────────────────────────
  board: () => data<Board>("/tasks/board"),
  /** Board with the web's server-side filters (mine, q, categoryId, overdue). */
  boardRaw: (qs: Record<string, string | boolean>) => {
    const q = Object.entries({ ...qs, _t: Date.now() })
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    return data<unknown>(`/tasks/board?${q}`);
  },
  tasks: (qs: Record<string, string | number | boolean>) => {
    const q = Object.entries(qs)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    return data<Task[]>(`/tasks?${q}`);
  },
  task: (id: string) => data<Task>(`/tasks/${id}`),
  events: (id: string) => data<TaskEvent[]>(`/tasks/${id}/events`),
  comments: (id: string) => data<Comment[]>(`/tasks/${id}/comments`),
  addComment: (id: string, body: string) =>
    data<Comment>(`/tasks/${id}/comments`, { method: "POST", body: { body } }),
  attachments: (id: string) => data<Attachment[]>(`/tasks/${id}/attachments`),
  signedUrl: (id: string, attachmentId: string) =>
    data<{ url: string; fileName: string; expiresIn: number }>(
      `/tasks/${id}/attachments/${attachmentId}/signed-url`,
      { method: "POST" },
    ),
  deleteAttachment: (id: string, attachmentId: string) =>
    request<void>(`/tasks/${id}/attachments/${attachmentId}`, { method: "DELETE" }),
  upload: (id: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } file descriptors.
    form.append("file", file as unknown as Blob);
    return data<Attachment>(`/tasks/${id}/attachments`, {
      method: "POST",
      form,
      timeoutMs: 60_000,
    });
  },
  createTask: (t: {
    title: string;
    description?: string;
    categoryId: string;
    officeId: string;
    priority: Priority;
    dueDate?: string;
  }) => data<Task>("/tasks", { method: "POST", body: t }),
  assign: (id: string, ownerId: string, priority: Priority, dueDate: string) =>
    data<Task>(`/tasks/${id}/assign`, { method: "POST", body: { ownerId, priority, dueDate } }),
  transition: (id: string, to: TaskStatus, reason?: string) =>
    data<Task>(`/tasks/${id}/transition`, {
      method: "POST",
      body: { to, ...(reason ? { reason } : {}) },
    }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
  delegate: (id: string, delegateId: string, reason?: string) =>
    data<unknown>(`/tasks/${id}/delegate`, {
      method: "POST",
      body: { delegateId, ...(reason ? { reason } : {}) },
    }),
  pendingDelegations: () => data<PendingDelegation[]>("/tasks/delegations/pending"),
  respondDelegation: (taskId: string, delegationId: string, action: "ACCEPTED" | "DECLINED") =>
    data<unknown>(`/tasks/${taskId}/delegation/${delegationId}/respond`, {
      method: "POST",
      body: { action },
    }),

  // ── Reports ─────────────────────────────────────────────
  summary: () => data<Summary>("/reports/summary"),

  // ── Support tickets ─────────────────────────────────────
  tickets: () => data<Ticket[]>("/tickets"),
  ticket: (id: string) => data<Ticket>(`/tickets/${id}`),
  createTicket: (t: {
    subject: string;
    description: string;
    category: string;
    priority: Priority;
  }) => {
    const form = new FormData();
    Object.entries(t).forEach(([k, v]) => form.append(k, v));
    return data<Ticket>("/tickets", { method: "POST", form });
  },
  replyTicket: (id: string, message: string) => {
    const form = new FormData();
    form.append("message", message);
    return data<unknown>(`/tickets/${id}/reply`, { method: "POST", form });
  },
  setTicketStatus: (id: string, status: TicketStatus) =>
    data<Ticket>(`/tickets/${id}`, { method: "PATCH", body: { status } }),

  // ── Admin (Dean / Administrator) ────────────────────────
  adminUsers: () => data<AdminUser[]>("/users?includeInactive=true"),
  invites: () => data<PendingInvite[]>("/users/invites"),
  invite: (email: string, role: Role, fullName?: string, officeId?: string) =>
    data<unknown>("/users/invite", {
      method: "POST",
      body: { email, role, ...(fullName ? { fullName } : {}), ...(officeId ? { officeId } : {}) },
    }),
  deactivateUser: (id: string) => data<unknown>(`/users/${id}/deactivate`, { method: "POST" }),
  reactivateUser: (id: string) => data<unknown>(`/users/${id}/reactivate`, { method: "POST" }),
  unlockUser: (id: string) => data<unknown>(`/users/${id}/unlock`, { method: "POST" }),
  audit: async (skip: number, q: string) => {
    const r = await request<{ data: AuditRow[]; meta: { total: number } }>(
      `/audit?take=30&skip=${skip}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    );
    return r;
  },
};
