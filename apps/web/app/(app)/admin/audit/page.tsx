"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Role, User } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import {
  Search,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  User as UserIcon,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

type AuditActor = { id: string; fullName: string; role: Role } | null;

type AuditEntry = {
  id: string;
  actorId: string | null;
  actor: AuditActor;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  meta: unknown;
  hash: string;
  prevHash: string | null;
  createdAt: string;
};

type VerifyResult = {
  total: number;
  verified: number;
  tampered: number;
  chainIntact: boolean;
  contentIntact: boolean;
  brokenAt: string | null;
  entries: { id: string; index: number; hashMatches: boolean; linkMatches: boolean; ok: boolean }[];
  capped: boolean;
};

const ACTION_COMMON = [
  "auth.login",
  "auth.login_failed",
  "auth.login_locked",
  "auth.logout",
  "auth.password_changed",
  "auth.password_reset",
  "auth.2fa_enabled",
  "auth.2fa_disabled",
  "auth.impersonate_start",
  "auth.impersonate_stop",
  "user.invited",
  "user.updated",
  "user.deactivated",
  "user.reactivated",
  "user.unlocked",
  "user.reset_link_generated",
  "user.invite_revoked",
];

const ENTITIES = ["User", "Invite", "Task", "Office", "Category"];
const TAKE = 50;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function actionColor(action: string): string {
  if (action.includes("failed") || action.includes("locked") || action.includes("deactivated"))
    return "text-red-400 bg-red-500/10 border-red-500/20";
  if (action.includes("impersonate") || action.includes("2fa"))
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  if (action.includes("login") || action.includes("logout"))
    return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  return "text-slate-300 bg-slate-500/10 border-slate-500/20";
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [actors, setActors] = useState<User[]>([]);

  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [showVerify, setShowVerify] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: User[] }>("/users")
      .then((r) => setActors(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tmr = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("take", String(TAKE));
      params.set("skip", String(page * TAKE));
      if (q) params.set("q", q);
      if (actorId) params.set("actorId", actorId);
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const r = await api<{ data: AuditEntry[]; meta: { total: number } }>(
        `/audit?${params.toString()}`,
      );
      setEntries(r.data);
      setTotal(r.meta.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, q, actorId, action, entityType, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / TAKE));
  const filtersActive =
    q !== "" || actorId !== "" || action !== "" || entityType !== "" || from !== "" || to !== "";

  function resetFilters() {
    setQ("");
    setSearchInput("");
    setActorId("");
    setAction("");
    setEntityType("");
    setFrom("");
    setTo("");
    setPage(0);
  }

  function exportCSV() {
    if (!entries) return;
    const rows: (string | number)[][] = [
      [
        "Timestamp",
        "Actor",
        "Role",
        "Action",
        "Entity Type",
        "Entity ID",
        "IP",
        "User Agent",
        "Hash",
        "Prev Hash",
      ],
      ...entries.map((e) => [
        e.createdAt,
        e.actor?.fullName ?? "System",
        e.actor?.role ?? "",
        e.action,
        e.entityType ?? "",
        e.entityId ?? "",
        e.ip ?? "",
        e.userAgent ?? "",
        e.hash,
        e.prevHash ?? "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hawl-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function runVerify() {
    setVerifyBusy(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await api<{ data: VerifyResult }>(`/audit/verify?${params.toString()}`);
      setVerifyResult(r.data);
    } catch (e) {
      setVerifyError(e instanceof ApiError ? e.message : "Verification failed");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-black text-primary">Audit Log</h1>
          <p className="mt-2 text-sm text-secondary">
            Immutable, hash-chained record of every action in the system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowVerify(true);
              void runVerify();
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-bold text-primary hover:bg-panel-hover transition"
          >
            <ShieldCheck size={16} /> Verify chain
          </button>
          <button
            onClick={exportCSV}
            disabled={!entries || entries.length === 0}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition disabled:opacity-50"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400"
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-panel p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
          <div className="relative xl:col-span-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search action, entity ID, or IP…"
              className="w-full rounded-xl border border-border bg-app py-2 ps-10 pe-4 text-sm text-primary placeholder-muted outline-none transition focus:border-accent"
            />
          </div>
          <select
            value={actorId}
            onChange={(e) => {
              setActorId(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-border bg-app px-3 py-2 text-sm text-primary outline-none focus:border-accent"
          >
            <option value="">All actors</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-border bg-app px-3 py-2 text-sm text-primary outline-none focus:border-accent"
          >
            <option value="">All actions</option>
            {ACTION_COMMON.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-border bg-app px-3 py-2 text-sm text-primary outline-none focus:border-accent"
          >
            <option value="">All entities</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-xl border border-border bg-app px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-xl border border-border bg-app px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          {filtersActive && (
            <button
              onClick={resetFilters}
              className="self-end flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-muted hover:text-primary"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-panel overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted opacity-50 mb-3" />
            <p className="text-sm font-bold text-primary">No audit entries match these filters.</p>
            {filtersActive && (
              <button
                onClick={resetFilters}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border bg-app px-3 py-1.5 text-xs font-bold text-muted hover:text-primary"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-app text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 text-start">Time</th>
                  <th className="px-4 py-3 text-start">Actor</th>
                  <th className="px-4 py-3 text-start">Action</th>
                  <th className="px-4 py-3 text-start">Entity</th>
                  <th className="px-4 py-3 text-start">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setDetail(e)}
                    className="hover:bg-panel-hover transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 text-xs text-secondary whitespace-nowrap font-mono">
                      {formatTime(e.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <UserIcon size={12} className="text-muted shrink-0" />
                        <span className="font-bold text-primary group-hover:text-accent transition-colors truncate">
                          {e.actor?.fullName ?? "System"}
                        </span>
                      </div>
                      {e.actor?.role && (
                        <p className="text-[10px] uppercase tracking-wider text-muted mt-0.5 ps-5">
                          {e.actor.role}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionColor(e.action)}`}
                      >
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">
                      {e.entityType ? (
                        <span className="font-mono">
                          {e.entityType}
                          {e.entityId && (
                            <span className="text-muted">:{e.entityId.slice(0, 8)}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted font-mono">{e.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > TAKE && (
          <div className="flex items-center justify-between border-t border-border bg-app px-4 py-3">
            <p className="text-xs font-bold text-muted">
              Showing {page * TAKE + 1}–{Math.min((page + 1) * TAKE, total)} of{" "}
              {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-bold text-primary hover:bg-panel-hover disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs font-bold text-muted">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-panel px-3 py-1.5 text-xs font-bold text-primary hover:bg-panel-hover disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Audit entry"
        description={detail ? formatTime(detail.createdAt) : ""}
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Actor
                </p>
                <p className="font-bold text-primary">{detail.actor?.fullName ?? "System"}</p>
                {detail.actor?.role && <p className="text-xs text-muted">{detail.actor.role}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Action
                </p>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionColor(detail.action)}`}
                >
                  {detail.action}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Entity
                </p>
                <p className="font-mono text-xs text-secondary">{detail.entityType ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Entity ID
                </p>
                <p className="font-mono text-xs text-secondary break-all">
                  {detail.entityId ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">IP</p>
                <p className="font-mono text-xs text-secondary">{detail.ip ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  User agent
                </p>
                <p className="font-mono text-[10px] text-secondary break-all">
                  {detail.userAgent ?? "—"}
                </p>
              </div>
            </div>

            {detail.meta ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Metadata
                </p>
                <pre className="rounded-lg border border-border bg-app p-3 text-[11px] font-mono text-secondary overflow-x-auto">
                  {JSON.stringify(detail.meta, null, 2)}
                </pre>
              </div>
            ) : null}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Hash</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-border bg-app p-2 text-[10px] font-mono text-[#e8bc69] break-all">
                  {detail.hash}
                </code>
                <button
                  onClick={() => copyText("hash", detail.hash)}
                  className="shrink-0 rounded-lg border border-border bg-app p-2 text-muted hover:text-primary transition"
                >
                  {copiedKey === "hash" ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                Previous hash
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-border bg-app p-2 text-[10px] font-mono text-muted break-all">
                  {detail.prevHash ?? "(genesis)"}
                </code>
                {detail.prevHash && (
                  <button
                    onClick={() => copyText("prevHash", detail.prevHash!)}
                    className="shrink-0 rounded-lg border border-border bg-app p-2 text-muted hover:text-primary transition"
                  >
                    {copiedKey === "prevHash" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setDetail(null)}
              className="w-full rounded-xl border border-border bg-app px-4 py-2 text-sm font-bold text-primary hover:bg-panel-hover transition"
            >
              Close
            </button>
          </div>
        )}
      </Modal>

      {/* Verify Modal */}
      <Modal
        isOpen={showVerify}
        onClose={() => setShowVerify(false)}
        title="Verify audit chain"
        description="Recompute each entry's hash and confirm the chain links are intact. Uses the current date range (empty = all entries, up to 5,000)."
      >
        <div className="space-y-4">
          {verifyBusy && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-[#e8bc69]" />
              <p className="text-sm font-bold text-secondary">Verifying chain…</p>
            </div>
          )}

          {verifyError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
              <AlertCircle size={18} /> {verifyError}
            </div>
          )}

          {verifyResult && (
            <div className="space-y-4">
              {verifyResult.total === 0 ? (
                <div className="rounded-xl border border-border bg-app p-4 text-center text-sm text-muted">
                  No audit entries to verify in this range.
                </div>
              ) : verifyResult.tampered === 0 &&
                verifyResult.chainIntact &&
                verifyResult.contentIntact ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                  <p className="text-sm font-black text-emerald-400">Chain intact</p>
                  <p className="text-xs text-emerald-300/80 mt-1">
                    All {verifyResult.total.toLocaleString()} entries verified. Hashes and links all
                    match.
                  </p>
                </div>
              ) : verifyResult.chainIntact && !verifyResult.contentIntact ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                  <ShieldAlert className="mx-auto h-10 w-10 text-amber-400 mb-2" />
                  <p className="text-sm font-black text-amber-400">
                    Chain links OK — hash recipe mismatch
                  </p>
                  <p className="text-xs text-amber-300/80 mt-1">
                    All prevHash/hash links are intact. Individual hashes don't match our recomputed
                    values, which usually means the audit lib uses a different hash recipe. See
                    comment in routes.ts.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
                  <ShieldAlert className="mx-auto h-10 w-10 text-red-400 mb-2" />
                  <p className="text-sm font-black text-red-400">Chain broken</p>
                  <p className="text-xs text-red-300/80 mt-1">
                    {verifyResult.tampered} of {verifyResult.total.toLocaleString()} entries failed
                    verification.
                    {verifyResult.brokenAt && (
                      <>
                        {" "}
                        First broken entry:{" "}
                        <code className="font-mono">{verifyResult.brokenAt}</code>
                      </>
                    )}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border bg-app p-3">
                  <p className="text-2xl font-black text-primary">
                    {verifyResult.total.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Checked
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-app p-3">
                  <p className="text-2xl font-black text-emerald-400">
                    {verifyResult.verified.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Verified
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-app p-3">
                  <p
                    className={`text-2xl font-black ${verifyResult.tampered > 0 ? "text-red-400" : "text-muted"}`}
                  >
                    {verifyResult.tampered.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Failed
                  </p>
                </div>
              </div>

              {verifyResult.capped && (
                <p className="text-xs text-amber-400 text-center">
                  Only the first 5,000 entries were verified. Narrow the date range for a complete
                  check.
                </p>
              )}

              <button
                onClick={() => void runVerify()}
                disabled={verifyBusy}
                className="w-full rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-text hover:bg-accent-hover transition disabled:opacity-50"
              >
                Re-run verification
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
