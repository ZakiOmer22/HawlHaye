"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Office, Category } from "@/lib/types";
import { usePreferences } from "@/lib/preferences";
import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Printer,
  Loader2,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Ban,
  ShieldAlert,
  Users as UsersIcon,
  Activity,
  ArrowUpRight,
  Inbox,
  Lock,
  FileDown,
} from "lucide-react";

type SummaryData = {
  totalTasks: number;
  completed: number;
  completionRate: number;
  overdueTasks: number;
  dueSoonTasks: number;
  avgCompletionDays: number;
  onTimeRate: number;
  byStatus: Record<string, number>;
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
  timeline: { date: string; created: number; completed: number }[];
};

type SystemData = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newTasks7d: number;
  failedLogins24h: number;
  lockedAccounts: number;
  recentEvents: {
    id: string;
    action: string;
    actor: string;
    actorRole: string | null;
    createdAt: string;
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  UNASSIGNED: "#94A3B8",
  ASSIGNED: "#60A5FA",
  IN_PROGRESS: "#E8BC69",
  BLOCKED: "#F87171",
  REVIEW: "#A78BFA",
  COMPLETED: "#34D399",
};

const STATUS_LABEL: Record<string, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  REVIEW: "In Review",
  COMPLETED: "Completed",
};

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { t } = usePreferences();
  const [tab, setTab] = useState<"tasks" | "system">("tasks");

  const [rangeDays, setRangeDays] = useState<"7" | "30" | "90">("30");
  const [officeId, setOfficeId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [offices, setOffices] = useState<Office[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [system, setSystem] = useState<SystemData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ data: Office[] }>("/offices").catch(() => ({ data: [] })),
      api<{ data: Category[] }>("/categories").catch(() => ({ data: [] })),
    ]).then(([o, c]) => {
      setOffices(o.data);
      setCategories(c.data);
    });
  }, []);

  const loadSummary = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("from", daysAgoISO(Number(rangeDays)));
    if (officeId) params.set("officeId", officeId);
    if (categoryId) params.set("categoryId", categoryId);

    const res = await api<{ data: SummaryData }>(`/reports/summary?${params.toString()}`);
    setSummary(res.data);
  }, [rangeDays, officeId, categoryId]);

  const loadSystem = useCallback(async () => {
    const res = await api<{ data: SystemData }>("/reports/system");
    setSystem(res.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        if (tab === "tasks") await loadSummary();
        else await loadSystem();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, loadSummary, loadSystem]);

  const statusChartData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byStatus)
      .map(([status, count]) => ({ status, name: STATUS_LABEL[status] ?? status, count }))
      .sort((a, b) => b.count - a.count);
  }, [summary]);

  const handleExportCSV = () => {
    if (tab === "tasks" && summary) {
      const rows: (string | number)[][] = [
        ["HAWL Task Analytics Report"],
        ["Range", `Last ${rangeDays} days`],
        ["Generated", new Date().toLocaleString()],
        [],
        ["Metric", "Value"],
        ["Total Tasks", summary.totalTasks],
        ["Completed", summary.completed],
        ["Completion Rate", `${summary.completionRate}%`],
        ["Overdue", summary.overdueTasks],
        ["Due Soon (3d)", summary.dueSoonTasks],
        ["Avg Days to Complete", summary.avgCompletionDays],
        ["On-Time Rate", `${summary.onTimeRate}%`],
        [],
        ["Status Breakdown"],
        ["Status", "Count"],
        ...statusChartData.map((r) => [r.name, r.count]),
        [],
        ["Team Workload"],
        ["Member", "Active", "Blocked", "Review", "Total"],
        ...summary.workload.map((w) => [w.name, w.active, w.blocked, w.review, w.total]),
        [],
        ["Blocked Tasks"],
        ["Code", "Title", "Owner", "Reason", "Days Blocked"],
        ...summary.blockedTasks.map((b) => [b.code, b.title, b.owner, b.reason ?? "—", b.days]),
        [],
        ["Pending Review"],
        ["Code", "Title", "Owner", "Days Waiting"],
        ...summary.pendingReview.map((p) => [p.code, p.title, p.owner, p.days]),
      ];
      downloadCSV(`hawl-analytics-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } else if (tab === "system" && system) {
      const rows: (string | number)[][] = [
        ["HAWL System Health Report"],
        ["Generated", new Date().toLocaleString()],
        [],
        ["Metric", "Value"],
        ["Total Users", system.totalUsers],
        ["Active Users", system.activeUsers],
        ["Inactive Users", system.inactiveUsers],
        ["New Tasks (7d)", system.newTasks7d],
        ["Failed Logins (24h)", system.failedLogins24h],
        ["Locked Accounts", system.lockedAccounts],
        [],
        ["Recent Events"],
        ["Actor", "Role", "Action", "Time"],
        ...system.recentEvents.map((e) => [
          e.actor,
          e.actorRole ?? "—",
          e.action,
          new Date(e.createdAt).toLocaleString(),
        ]),
      ];
      downloadCSV(`hawl-system-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-black text-black">HAWL Institutional Report</h1>
        <p className="text-sm text-gray-600 mt-1">
          {tab === "tasks" ? `Task Analytics — Last ${rangeDays} days` : "System Health"} ·
          Generated {new Date().toLocaleString()}
        </p>
      </div>

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            Insights
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{t("reports.title")}</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">{t("reports.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#334155] transition"
          >
            <FileDown size={16} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-[#e8bc69] px-4 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition"
          >
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </header>

      <div
        role="tablist"
        className="flex items-center gap-1 rounded-xl border border-[#334155] bg-[#0F172A] p-1 w-fit print:hidden"
      >
        <button
          role="tab"
          aria-selected={tab === "tasks"}
          onClick={() => setTab("tasks")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
            tab === "tasks"
              ? "bg-[#1E293B] text-white shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <BarChart3 size={16} /> Task Analytics
        </button>
        <button
          role="tab"
          aria-selected={tab === "system"}
          onClick={() => setTab("system")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
            tab === "system"
              ? "bg-[#1E293B] text-white shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Activity size={16} /> System Health
        </button>
      </div>

      {tab === "tasks" && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(e.target.value as "7" | "30" | "90")}
            className="rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[#e8bc69]"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            className="rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[#e8bc69]"
          >
            <option value="">All Offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[#e8bc69]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400"
        >
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#e8bc69]" />
        </div>
      ) : tab === "tasks" && summary ? (
        <div className="space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={BarChart3}
              label="Total Tasks"
              value={summary.totalTasks}
              color="text-white"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Completion Rate"
              value={`${summary.completionRate}%`}
              color="text-emerald-400"
              sub={`${summary.completed} completed`}
            />
            <KpiCard
              icon={Clock}
              label="Overdue"
              value={summary.overdueTasks}
              color="text-red-400"
              sub={`${summary.dueSoonTasks} due in 3 days`}
            />
            <KpiCard
              icon={ArrowUpRight}
              label="On-Time Rate"
              value={`${summary.onTimeRate}%`}
              color="text-[#e8bc69]"
              sub={`Avg ${summary.avgCompletionDays}d to complete`}
            />
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
              <h2 className="text-lg font-bold text-white mb-1">Workflow Distribution</h2>
              <p className="text-xs text-[#94A3B8] mb-4">Tasks by current status</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#64748B"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
              <h2 className="text-lg font-bold text-white mb-1">Activity Timeline</h2>
              <p className="text-xs text-[#94A3B8] mb-4">
                Tasks created vs. completed (last 30 days)
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={summary.timeline}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748B", fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                      stroke="#334155"
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      stroke="#334155"
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                    <Line
                      type="monotone"
                      dataKey="created"
                      name="Created"
                      stroke="#E8BC69"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="#34D399"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
            <h2 className="text-lg font-bold text-white mb-1">Team Workload</h2>
            <p className="text-xs text-[#94A3B8] mb-4">Active tasks per team member</p>
            {summary.workload.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#94A3B8]">
                No active tasks assigned yet.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.workload}
                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748B", fontSize: 10 }}
                      stroke="#334155"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      stroke="#334155"
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "1px solid #334155",
                        borderRadius: 12,
                        color: "white",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                    <Bar dataKey="active" name="Active" stackId="s" fill="#E8BC69" />
                    <Bar dataKey="blocked" name="Blocked" stackId="s" fill="#F87171" />
                    <Bar
                      dataKey="review"
                      name="In Review"
                      stackId="s"
                      fill="#A78BFA"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Ban size={18} className="text-red-400" /> Blocked Tasks
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Oldest first</p>
                </div>
                <span className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-400">
                  {summary.blockedTasks.length}
                </span>
              </div>
              {summary.blockedTasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#94A3B8]">No blocked tasks.</p>
              ) : (
                <div className="space-y-2">
                  {summary.blockedTasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className="block rounded-lg border border-[#334155] bg-[#0F172A] p-3 hover:border-red-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[#64748B]">{t.code}</span>
                        <span className="text-[10px] font-bold text-red-400">
                          {t.days}d blocked
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white mt-0.5 truncate">{t.title}</p>
                      <p className="text-xs text-[#94A3B8] truncate">
                        {t.owner} {t.reason && `· ${t.reason}`}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Inbox size={18} className="text-violet-400" /> Pending Review
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Waiting for approval</p>
                </div>
                <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-xs font-bold text-violet-400">
                  {summary.pendingReview.length}
                </span>
              </div>
              {summary.pendingReview.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#94A3B8]">
                  Nothing awaiting approval.
                </p>
              ) : (
                <div className="space-y-2">
                  {summary.pendingReview.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className="block rounded-lg border border-[#334155] bg-[#0F172A] p-3 hover:border-violet-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-[#64748B]">{t.code}</span>
                        <span className="text-[10px] font-bold text-violet-400">
                          {t.days}d waiting
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white mt-0.5 truncate">{t.title}</p>
                      <p className="text-xs text-[#94A3B8] truncate">{t.owner}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : tab === "system" && system ? (
        <div className="space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={UsersIcon}
              label="Active Accounts"
              value={system.activeUsers}
              color="text-emerald-400"
              sub={`${system.inactiveUsers} inactive`}
            />
            <KpiCard
              icon={BarChart3}
              label="New Tasks (7d)"
              value={system.newTasks7d}
              color="text-white"
            />
            <KpiCard
              icon={ShieldAlert}
              label="Failed Logins (24h)"
              value={system.failedLogins24h}
              color="text-amber-400"
            />
            <KpiCard
              icon={Lock}
              label="Locked Accounts"
              value={system.lockedAccounts}
              color="text-red-400"
            />
          </section>

          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
            <h2 className="text-lg font-bold text-white mb-1">Recent Security Events</h2>
            <p className="text-xs text-[#94A3B8] mb-4">Live view of the last 15 audit events</p>
            {system.recentEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#94A3B8]">No recent activity.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead className="border-b border-[#334155] text-xs uppercase tracking-wider text-[#94A3B8]">
                    <tr>
                      <th className="py-2 text-start font-bold">Actor</th>
                      <th className="py-2 text-start font-bold">Role</th>
                      <th className="py-2 text-start font-bold">Action</th>
                      <th className="py-2 text-start font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {system.recentEvents.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5 font-bold text-white">{e.actor}</td>
                        <td className="py-2.5 text-[#94A3B8] text-xs">{e.actorRole ?? "—"}</td>
                        <td className="py-2.5">
                          <code className="rounded bg-[#0F172A] px-2 py-0.5 text-[11px] text-[#e8bc69]">
                            {e.action}
                          </code>
                        </td>
                        <td className="py-2.5 text-[#94A3B8] text-xs">
                          {new Date(e.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={color} />
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
          {label}
        </p>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[#94A3B8] mt-1">{sub}</p>}
    </div>
  );
}
