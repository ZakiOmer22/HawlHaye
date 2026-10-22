"use client";

import { useEffect, useState, useMemo } from "react";
import { api, ApiError } from "@/lib/api";
import type { User, Role, Office } from "@/lib/types";
import { UserPlus, Search, Mail, Shield, X, CheckCircle2, AlertCircle } from "lucide-react";

const ROLES: Role[] = [
  "ADMINISTRATOR",
  "DEAN",
  "DEPUTY",
  "FACULTY_COORDINATOR",
  "LABS_COORDINATOR",
  "LAB_TECHNICIAN",
];

const ROLE_COLORS: Record<Role, string> = {
  ADMINISTRATOR: "bg-red-500/10 text-red-400 border-red-500/20",
  DEAN: "bg-[#e8bc69]/10 text-[#e8bc69] border-[#e8bc69]/20",
  DEPUTY: "bg-[#e8bc69]/10 text-[#e8bc69] border-[#e8bc69]/20",
  FACULTY_COORDINATOR: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LABS_COORDINATOR: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  LAB_TECHNICIAN: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Invite Form State
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("LAB_TECHNICIAN");
  const [officeId, setOfficeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  async function reload() {
    try {
      const [u, o] = await Promise.all([
        api<{ data: User[] }>("/users"),
        api<{ data: Office[] }>("/offices").catch(() => ({ data: [] })),
      ]);
      setUsers(u.data);
      setOffices(o.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load users");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

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
      setInviteResult(
        r.data.token
          ? `Invite created successfully! Share this secure token with the user (Dev only): ${r.data.token}`
          : "Invitation email sent successfully.",
      );
      setEmail("");
      setOfficeId("");
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  if (error && !users) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load users</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-[#1E293B]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[#1E293B] border border-[#334155]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">User Management</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Manage institutional access, roles, and invitations.
          </p>
        </div>

        <button
          onClick={() => setShowInvite(!showInvite)}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition shadow-lg ${
            showInvite
              ? "bg-[#1E293B] text-[#94A3B8] border border-[#334155] hover:text-white"
              : "bg-[#e8bc69] text-[#0F172A] hover:bg-[#f1cf8b] shadow-[#e8bc69]/20"
          }`}
        >
          {showInvite ? (
            <>
              <X size={16} /> Cancel
            </>
          ) : (
            <>
              <UserPlus size={16} /> Invite User
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {inviteResult && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
          <p className="break-all">{inviteResult}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <p>{error}</p>
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <form
          onSubmit={invite}
          className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Mail size={16} className="text-[#e8bc69]" /> Send New Invitation
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Email Address
              </label>
              <input
                required
                type="email"
                placeholder="name@cecit.edu.so"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Office Assignment
              </label>
              <select
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
              >
                <option value="">No specific office</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              disabled={busy}
              type="submit"
              className="rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      )}

      {/* User List */}
      <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-[#334155] flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name, email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-[#e8bc69]"
            />
          </div>
          <span className="text-xs font-bold text-[#94A3B8] bg-[#0F172A] px-3 py-1.5 rounded-lg border border-[#334155]">
            {filteredUsers.length} Users
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0F172A] text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Office</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#94A3B8]">
                    No users found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#0F172A]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#334155] text-sm font-black text-white border border-[#475569]">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-[#e8bc69] transition-colors">
                            {u.fullName}
                          </p>
                          <p className="text-xs text-[#94A3B8]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[u.role]}`}
                      >
                        <Shield size={12} />
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#A0ABC0]">
                      {/* Note: If your User type doesn't include the office name yet, just show a placeholder */}
                      {u.officeId ? "Assigned" : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
