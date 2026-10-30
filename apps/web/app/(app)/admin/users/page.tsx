"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Role, Office } from "@/lib/types";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import { Modal } from "@/components/ui/Modal";
import {
  UserPlus,
  Search,
  Shield,
  CheckCircle2,
  AlertCircle,
  Lock,
  KeyRound,
  UserX,
  UserCheck,
  Copy,
  Check,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  Save,
  UserCog,
  ShieldAlert,
} from "lucide-react";

const ROLES: Role[] = [
  "ADMINISTRATOR",
  "DEAN",
  "DEPUTY",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
  "LAB_TECHNICIAN",
];

const ROLE_LABEL: Record<Role, TranslationKey> = {
  ADMINISTRATOR: "role.administrator",
  DEAN: "role.dean",
  DEPUTY: "role.deputy",
  FACULTY_COORDINATOR: "role.facultyCoordinator",
  LABS_COORDINATOR: "role.labsCoordinator",
  LAB_TECHNICIAN: "role.labTechnician",
};

const ROLE_COLORS: Record<Role, string> = {
  ADMINISTRATOR: "bg-red-500/10 text-red-500 border-red-500/20",
  DEAN: "bg-accent/10 text-accent border-accent/20",
  DEPUTY: "bg-accent/10 text-accent border-accent/20",
  FACULTY_COORDINATOR: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  LABS_COORDINATOR: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  LAB_TECHNICIAN: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const DEACTIVATE_REASONS = [
  "Left the institution",
  "Policy violation",
  "Security concern",
  "Duplicate account",
  "Role no longer required",
];

type RawUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  officeId: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  lockedUntil?: string | null;
  failedLoginCount?: number;
};

type UserStatus = "active" | "locked" | "inactive";
type FilterStatus = "all" | UserStatus;

function statusOf(u: RawUser): UserStatus {
  if (!u.active) return "inactive";
  if (u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now()) return "locked";
  return "active";
}

function minutesLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
}

const actionBtnClass =
  "flex w-full items-center gap-3 rounded-xl border border-border bg-app px-4 py-2.5 text-sm font-bold text-primary hover:bg-panel-hover transition disabled:opacity-40 disabled:cursor-not-allowed";

export default function AdminUsersPage() {
  const { t } = usePreferences();
  const [users, setUsers] = useState<RawUser[] | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Current viewer — extended with twoFAStatus for 2FA-gating
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: Role;
    twoFAStatus?: { enforcement: string };
  } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Modals & Forms
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("LAB_TECHNICIAN");
  const [officeId, setOfficeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  // Reset link
  const [resetLink, setResetLink] = useState<{
    name: string;
    email: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Row actions menu
  const [actionsUser, setActionsUser] = useState<RawUser | null>(null);

  // Edit modal
  const [editUser, setEditUser] = useState<RawUser | null>(null);
  const [editRole, setEditRole] = useState<Role>("LAB_TECHNICIAN");
  const [editOfficeId, setEditOfficeId] = useState("");

  // Deactivate modal (with reason)
  const [deactivateUser, setDeactivateUser] = useState<RawUser | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateNote, setDeactivateNote] = useState("");

  // Delete modal
  const [deleteUser, setDeleteUser] = useState<RawUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const reload = useCallback(async () => {
    try {
      const [userResponse, officeResponse] = await Promise.all([
        api<{ data: RawUser[] }>("/users?includeInactive=true"),
        api<{ data: Office[] }>("/offices").catch(() => ({ data: [] as Office[] })),
      ]);
      setUsers(userResponse.data);
      setOffices(officeResponse.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error.generic"));
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Load the current viewer + 2FA status
  useEffect(() => {
    api<{ data: { id: string; role: Role; twoFAStatus?: { enforcement: string } } }>("/auth/me")
      .then((res) =>
        setCurrentUser({
          id: res.data.id,
          role: res.data.role,
          twoFAStatus: res.data.twoFAStatus,
        }),
      )
      .catch(() => setCurrentUser(null));
  }, []);

  // 2FA gating helpers
  const is2FABlocked = currentUser?.twoFAStatus?.enforcement === "blocked";
  const twoFATip = is2FABlocked
    ? "Enable 2FA in Profile → Security to perform this action"
    : undefined;

  const officeMap = useMemo(() => {
    const m = new Map<string, string>();
    offices.forEach((o) => m.set(o.id, o.name));
    return m;
  }, [offices]);

  // Stats
  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, locked: 0, admins: 0 };
    return {
      total: users.length,
      active: users.filter((u) => statusOf(u) === "active").length,
      locked: users.filter((u) => statusOf(u) === "locked").length,
      admins: users.filter((u) => u.role === "ADMINISTRATOR" || u.role === "DEAN").length,
    };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);

      const matchStatus = filterStatus === "all" || statusOf(u) === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [users, searchQuery, filterStatus]);

  // Helpers
  const formatLastLogin = useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return t("admin.users.time.never");
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return t("admin.users.time.justNow");
      if (mins < 60) return t("admin.users.time.minsAgo", { mins });
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return t("admin.users.time.hrsAgo", { hrs });
      const days = Math.floor(hrs / 24);
      if (days < 30) return t("admin.users.time.daysAgo", { days });
      return d.toLocaleDateString();
    },
    [t],
  );

  // Handlers
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteResult(null);
    try {
      const r = await api<{ data: { token?: string } }>("/users/invite", {
        method: "POST",
        body: JSON.stringify({ email, role, officeId: officeId || undefined }),
      });

      const msg = r.data.token
        ? `Invite created. Share this token with ${email} (dev only): ${r.data.token}`
        : `Invitation sent to ${email}.`;

      setInviteResult(msg);
      setAnnouncement(`Invitation sent to ${email}.`);
      setEmail("");
      setOfficeId("");
      setIsInviteOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function unlock(u: RawUser) {
    if (!confirm(t("admin.users.unlock.confirm", { name: u.fullName }))) return;
    setActionBusy(u.id);
    try {
      await api(`/users/${u.id}/unlock`, { method: "POST" });
      setAnnouncement(`${u.fullName} unlocked.`);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unlock failed");
    } finally {
      setActionBusy(null);
    }
  }

  async function resetLinkFor(u: RawUser) {
    setActionBusy(u.id);
    try {
      const r = await api<{ data: { resetUrl: string; expiresAt: string } }>(
        `/users/${u.id}/reset-link`,
        { method: "POST" },
      );
      setResetLink({
        name: u.fullName,
        email: u.email,
        url: r.data.resetUrl,
        expiresAt: r.data.expiresAt,
      });
      setCopied(false);
      setAnnouncement(`Reset link generated for ${u.fullName}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate reset link");
    } finally {
      setActionBusy(null);
    }
  }

  async function reactivate(u: RawUser) {
    setActionBusy(u.id);
    try {
      await api(`/users/${u.id}/reactivate`, { method: "POST" });
      setAnnouncement(`${u.fullName} reactivated.`);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Reactivate failed");
    } finally {
      setActionBusy(null);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateUser) return;
    const reason = deactivateReason.trim();
    if (!reason) {
      setError("Please provide a reason for deactivation.");
      return;
    }
    setActionBusy(deactivateUser.id);
    setError(null);
    try {
      await api(`/users/${deactivateUser.id}/deactivate`, {
        method: "POST",
        body: JSON.stringify({
          reason,
          note: deactivateNote.trim() || undefined,
        }),
      });
      setAnnouncement(`${deactivateUser.fullName} deactivated (${reason}).`);
      setDeactivateUser(null);
      setDeactivateReason("");
      setDeactivateNote("");
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Deactivate failed");
    } finally {
      setActionBusy(null);
    }
  }

  function openEdit(u: RawUser) {
    setEditUser(u);
    setEditRole(u.role);
    setEditOfficeId(u.officeId || "");
  }

  async function saveEdit() {
    if (!editUser) return;
    setActionBusy(editUser.id);
    setError(null);
    try {
      await api(`/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: editRole,
          officeId: editOfficeId || null,
        }),
      });
      setAnnouncement(`${editUser.fullName} updated.`);
      setEditUser(null);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setActionBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    if (deleteConfirm !== deleteUser.fullName) {
      setError("Typed name does not match.");
      return;
    }
    setActionBusy(deleteUser.id);
    setError(null);
    try {
      await api(`/users/${deleteUser.id}`, { method: "DELETE" });
      setAnnouncement(`${deleteUser.fullName} deleted.`);
      setDeleteUser(null);
      setDeleteConfirm("");
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed");
    } finally {
      setActionBusy(null);
    }
  }

  async function resendInvite(u: RawUser) {
    setActionBusy(u.id);
    try {
      const r = await api<{ data: { token?: string } }>(`/users/${u.id}/resend-invite`, {
        method: "POST",
      });
      setInviteResult(
        r.data.token
          ? `Invite resent. Share this token with ${u.email} (dev only): ${r.data.token}`
          : `Invitation resent to ${u.email}.`,
      );
      setAnnouncement(`Invitation resent to ${u.email}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Resend failed");
    } finally {
      setActionBusy(null);
    }
  }

  async function impersonate(u: RawUser) {
    if (!currentUser) return;
    if (u.id === currentUser.id) return;
    if (u.role === "ADMINISTRATOR" || u.role === "DEAN") return;
    if (currentUser.role !== "ADMINISTRATOR" && currentUser.role !== "DEAN") return;

    setActionBusy(u.id);
    setError(null);
    try {
      await api(`/auth/impersonate/${u.id}`, { method: "POST" });
      window.location.replace(`/board?_r=${Date.now()}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to start impersonation");
      setActionBusy(null);
    }
  }

  async function copyResetUrl() {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (error && !users) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 max-w-md text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">{t("error.generic")}</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
        <div className="h-10 w-48 rounded bg-panel animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-panel border border-border animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-panel border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-black text-primary">{t("admin.users.title")}</h1>
          <p className="mt-2 text-sm text-secondary">{t("admin.users.subtitle")}</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          disabled={is2FABlocked}
          title={twoFATip}
          className="flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-accent-text hover:bg-accent-hover shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UserPlus size={16} /> {t("admin.users.invite")}
        </button>
      </header>

      {/* 2FA blocked inline notice (in addition to the global banner) */}
      {is2FABlocked && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <p>
            <strong className="font-black">High-risk actions disabled.</strong> Enable two-factor
            authentication in{" "}
            <a href="/profile/security" className="font-bold underline hover:text-red-300">
              Profile → Security
            </a>{" "}
            to invite users, change roles, reset passwords, deactivate, or delete accounts.
          </p>
        </div>
      )}

      {/* Alerts */}
      {inviteResult && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500"
        >
          <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
          <p className="break-all">{inviteResult}</p>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500"
        >
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <p>{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-primary" size={20} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
              {t("admin.users.stats.total")}
            </p>
          </div>
          <p className="text-3xl font-black text-primary">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="text-emerald-500" size={20} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
              {t("admin.users.stats.active")}
            </p>
          </div>
          <p className="text-3xl font-black text-emerald-500">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="text-red-500" size={20} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
              {t("admin.users.stats.locked")}
            </p>
          </div>
          <p className="text-3xl font-black text-red-500">{stats.locked}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="text-accent" size={20} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
              {t("admin.users.stats.admins")}
            </p>
          </div>
          <p className="text-3xl font-black text-accent">{stats.admins}</p>
        </div>
      </section>

      {/* Main Content */}
      <div className="rounded-2xl border border-border bg-panel overflow-hidden shadow-sm flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div
            role="tablist"
            className="flex items-center gap-1 bg-app p-1 rounded-xl border border-border w-fit"
          >
            {(["all", "active", "locked", "inactive"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filterStatus === f}
                onClick={() => setFilterStatus(f)}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold capitalize transition ${
                  filterStatus === f
                    ? "bg-panel text-primary shadow-sm border border-border/50"
                    : "text-muted hover:text-primary border border-transparent"
                }`}
              >
                {f === "all"
                  ? t("admin.users.filter.all")
                  : f === "active"
                    ? t("admin.users.filter.active")
                    : f === "locked"
                      ? t("admin.users.filter.locked")
                      : t("admin.users.filter.inactive")}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="search"
              placeholder={t("admin.users.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-app py-2 ps-10 pe-4 text-sm text-primary placeholder-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-start text-sm">
            <thead className="bg-app text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-6 py-4 text-start">
                  {t("admin.users.table.user")}
                </th>
                <th scope="col" className="px-6 py-4 text-start">
                  {t("admin.users.table.role")}
                </th>
                <th scope="col" className="px-6 py-4 text-start">
                  {t("admin.users.table.office")}
                </th>
                <th scope="col" className="px-6 py-4 text-start">
                  {t("admin.users.table.lastLogin")}
                </th>
                <th scope="col" className="px-6 py-4 text-start">
                  {t("admin.users.table.status")}
                </th>
                <th scope="col" className="px-6 py-4 text-end">
                  {t("admin.users.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    {t("admin.users.table.empty")}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const status = statusOf(u);
                  const busyRow = actionBusy === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-panel-hover transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app border border-border text-sm font-black text-secondary">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-primary group-hover:text-accent transition-colors truncate">
                              {u.fullName}
                            </p>
                            <p className="text-xs text-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[u.role]}`}
                        >
                          <Shield size={12} />
                          {t(ROLE_LABEL[u.role])}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-secondary text-xs">
                        {u.officeId ? (officeMap.get(u.officeId) ?? "—") : "—"}
                      </td>
                      <td className="px-6 py-4 text-secondary text-xs">
                        {formatLastLogin(u.lastLoginAt)}
                      </td>
                      <td className="px-6 py-4">
                        {status === "active" && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t("admin.users.stats.active")}
                          </span>
                        )}
                        {status === "locked" && u.lockedUntil && (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20"
                            title={`Locked for ${minutesLeft(u.lockedUntil)} more minutes`}
                          >
                            <Lock size={11} />
                            {t("admin.users.status.lockedTime", {
                              mins: minutesLeft(u.lockedUntil),
                            })}
                          </span>
                        )}
                        {status === "inactive" && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-500/10 px-2.5 py-1 rounded-md border border-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            {t("admin.users.status.deactivated")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="inline-flex items-center gap-1">
                          {status === "locked" && (
                            <button
                              type="button"
                              onClick={() => void unlock(u)}
                              disabled={busyRow}
                              title="Unlock account"
                              aria-label={`Unlock ${u.fullName}`}
                              className="rounded-lg p-2 text-amber-500 hover:bg-amber-500/10 transition disabled:opacity-50"
                            >
                              <Lock size={14} />
                            </button>
                          )}
                          {status === "active" && (
                            <button
                              type="button"
                              onClick={() => void resetLinkFor(u)}
                              disabled={busyRow || is2FABlocked}
                              title={twoFATip || "Generate reset link"}
                              aria-label={`Generate reset link for ${u.fullName}`}
                              className="rounded-lg p-2 text-muted hover:bg-accent/10 hover:text-accent transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <KeyRound size={14} />
                            </button>
                          )}
                          {status === "inactive" && (
                            <button
                              type="button"
                              onClick={() => void resendInvite(u)}
                              disabled={busyRow}
                              title="Resend invitation"
                              aria-label={`Resend invitation to ${u.fullName}`}
                              className="rounded-lg p-2 text-blue-500 hover:bg-blue-500/10 transition disabled:opacity-50"
                            >
                              <Send size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActionsUser(u)}
                            disabled={busyRow}
                            title="More actions"
                            aria-label={`More actions for ${u.fullName}`}
                            className="rounded-lg p-2 text-muted hover:bg-panel-hover hover:text-primary transition disabled:opacity-50"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title={t("admin.users.invite.title")}
        description={t("admin.users.invite.desc")}
      >
        <form onSubmit={invite} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="invite-email"
              className="text-[10px] font-bold uppercase tracking-wider text-muted"
            >
              {t("admin.users.invite.email")}
            </label>
            <input
              id="invite-email"
              required
              type="email"
              placeholder="name@cecit.edu.so"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary placeholder-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="invite-role"
                className="text-[10px] font-bold uppercase tracking-wider text-muted"
              >
                {t("admin.users.invite.role")}
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(ROLE_LABEL[r])}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="invite-office"
                className="text-[10px] font-bold uppercase tracking-wider text-muted"
              >
                {t("admin.users.invite.office")}
              </label>
              <select
                id="invite-office"
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value)}
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent"
              >
                <option value="">{t("admin.users.invite.noOffice")}</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
            >
              {t("common.cancel")}
            </button>
            <button
              disabled={busy}
              type="submit"
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text transition hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? t("admin.users.invite.sending") : t("admin.users.invite.submit")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Link Modal */}
      <Modal
        isOpen={!!resetLink}
        onClose={() => setResetLink(null)}
        title={t("admin.users.reset.title")}
        description={t("admin.users.reset.desc", {
          email: resetLink?.email || "",
          mins: resetLink ? minutesLeft(resetLink.expiresAt) : 0,
        })}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={resetLink?.url || ""}
              className="flex-1 rounded-lg border border-border bg-app px-3 py-2 text-xs font-mono text-primary outline-none focus:border-accent"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => void copyResetUrl()}
              className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-text hover:bg-accent-hover transition"
            >
              {copied ? (
                <>
                  <Check size={14} className="inline" /> {t("admin.users.reset.copied")}
                </>
              ) : (
                <>
                  <Copy size={14} className="inline" /> {t("admin.users.reset.copy")}
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => setResetLink(null)}
            className="mt-2 w-full rounded-xl border border-border bg-app px-4 py-2 text-sm font-bold text-primary hover:bg-panel-hover transition"
          >
            {t("admin.users.reset.done")}
          </button>
        </div>
      </Modal>

      {/* Actions Menu Modal */}
      <Modal
        isOpen={!!actionsUser}
        onClose={() => setActionsUser(null)}
        title={actionsUser?.fullName ?? ""}
        description={actionsUser?.email ?? ""}
      >
        {actionsUser && (
          <div className="space-y-2">
            <button
              onClick={() => {
                openEdit(actionsUser);
                setActionsUser(null);
              }}
              disabled={is2FABlocked}
              title={twoFATip}
              className={actionBtnClass}
            >
              <Pencil size={16} className="text-accent" /> Edit user details
            </button>

            {actionsUser.active && (
              <button
                onClick={() => {
                  const u = actionsUser;
                  setActionsUser(null);
                  void resetLinkFor(u);
                }}
                disabled={is2FABlocked}
                title={twoFATip}
                className={actionBtnClass}
              >
                <KeyRound size={16} className="text-accent" /> Generate reset link
              </button>
            )}

            {!actionsUser.active && (
              <button
                onClick={() => {
                  const u = actionsUser;
                  setActionsUser(null);
                  void resendInvite(u);
                }}
                className={actionBtnClass}
              >
                <Send size={16} className="text-blue-500" /> Resend invitation
              </button>
            )}

            {statusOf(actionsUser) === "locked" && (
              <button
                onClick={() => {
                  const u = actionsUser;
                  setActionsUser(null);
                  void unlock(u);
                }}
                className={actionBtnClass}
              >
                <Lock size={16} className="text-amber-500" /> Unlock account
              </button>
            )}

            {/* Impersonate — gated by 2FA + role conditions */}
            {currentUser &&
              actionsUser.active &&
              actionsUser.id !== currentUser.id &&
              actionsUser.role !== "ADMINISTRATOR" &&
              actionsUser.role !== "DEAN" &&
              (currentUser.role === "ADMINISTRATOR" || currentUser.role === "DEAN") && (
                <button
                  onClick={() => {
                    const u = actionsUser;
                    setActionsUser(null);
                    void impersonate(u);
                  }}
                  disabled={is2FABlocked}
                  title={twoFATip}
                  className={`${actionBtnClass} !border-amber-500/20 hover:!bg-amber-500/10 !text-amber-500`}
                >
                  <UserCog size={16} /> Impersonate user
                </button>
              )}

            {actionsUser.active ? (
              <button
                onClick={() => {
                  setDeactivateUser(actionsUser);
                  setDeactivateReason("");
                  setDeactivateNote("");
                  setActionsUser(null);
                }}
                disabled={is2FABlocked}
                title={twoFATip}
                className={`${actionBtnClass} !border-red-500/20 hover:!bg-red-500/10 !text-red-500`}
              >
                <UserX size={16} /> Deactivate user
              </button>
            ) : (
              <button
                onClick={() => {
                  const u = actionsUser;
                  setActionsUser(null);
                  void reactivate(u);
                }}
                disabled={is2FABlocked}
                title={twoFATip}
                className={`${actionBtnClass} !border-emerald-500/20 hover:!bg-emerald-500/10 !text-emerald-500`}
              >
                <UserCheck size={16} /> Reactivate user
              </button>
            )}

            <button
              onClick={() => {
                setDeleteUser(actionsUser);
                setDeleteConfirm("");
                setActionsUser(null);
              }}
              disabled={is2FABlocked}
              title={twoFATip}
              className={`${actionBtnClass} !border-red-500/20 hover:!bg-red-500/10 !text-red-500`}
            >
              <Trash2 size={16} /> Delete user
            </button>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit user"
        description={editUser?.email ?? ""}
      >
        {editUser && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-role"
                className="text-[10px] font-bold uppercase tracking-wider text-muted"
              >
                Role
              </label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(ROLE_LABEL[r])}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-office"
                className="text-[10px] font-bold uppercase tracking-wider text-muted"
              >
                Office
              </label>
              <select
                id="edit-office"
                value={editOfficeId}
                onChange={(e) => setEditOfficeId(e.target.value)}
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent"
              >
                <option value="">No office</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void saveEdit()}
                disabled={actionBusy === editUser.id}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text transition hover:bg-accent-hover disabled:opacity-50"
              >
                <Save size={14} /> Save changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate with Reason Modal */}
      <Modal
        isOpen={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        title="Deactivate user"
        description={`This will prevent ${deactivateUser?.fullName ?? ""} from signing in. A reason is required.`}
      >
        {deactivateUser && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Reason <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEACTIVATE_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDeactivateReason(r)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                      deactivateReason === r
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-app text-muted hover:text-primary"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Or type a custom reason…"
                className="mt-2 w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary placeholder-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Additional note (optional)
              </label>
              <textarea
                rows={3}
                value={deactivateNote}
                onChange={(e) => setDeactivateNote(e.target.value)}
                placeholder="Any additional context for the audit log…"
                className="w-full resize-none rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary placeholder-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/40"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeactivateUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void confirmDeactivate()}
                disabled={actionBusy === deactivateUser.id || !deactivateReason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                <UserX size={14} /> Deactivate
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Delete user"
        description="This action cannot be undone."
      >
        {deleteUser && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
              <p className="font-bold mb-1">This will permanently delete:</p>
              <p className="text-xs break-all">
                {deleteUser.fullName} ({deleteUser.email})
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Type the full name to confirm
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteUser.fullName}
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary placeholder-muted outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={actionBusy === deleteUser.id || deleteConfirm !== deleteUser.fullName}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete permanently
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
