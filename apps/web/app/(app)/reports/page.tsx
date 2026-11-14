"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Office, Category } from "@/lib/types";
import { usePreferences } from "@/lib/preferences";
import type { LucideIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  Printer, Loader2, AlertCircle, BarChart3, CheckCircle2, Clock, Ban,
  ShieldAlert, Users as UsersIcon, Activity, ArrowUpRight, Inbox, Lock,
  FileDown, Globe, Wifi, WifiOff, Timer, ExternalLink, RefreshCw, Server, Gauge,
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
  workload: { id: string; name: string; total: number; active: number; blocked: number; review: number }[];
  blockedTasks: { id: string; code: string; title: string; reason: string | null; days: number; owner: string }[];
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
  recentEvents: { id: string; action: string; actor: string; actorRole: string | null; createdAt: string }[];
};

type UptimeMonitor = {
  id: number;
  name: string;
  url: string | null;
  status: "up" | "down" | "paused" | "unknown";
  uptime: { day: number | null; week: number | null; month: number | null };
  avgResponseMs: number | null;
  lastDownAt: string | null;
};

type UptimeData = {
  mode: "data" | "link" | "none";
  statusPageUrl: string | null;
  overall: { uptime30d: number | null; monitorsDown: number; totalMonitors: number; avgResponseMs: number | null } | null;
  monitors: UptimeMonitor[];
  generatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  UNASSIGNED: "#94A3B8", ASSIGNED: "#60A5FA", IN_PROGRESS: "#E8BC69",
  BLOCKED: "#F87171", REVIEW: "#A78BFA", COMPLETED: "#34D399",
};
const STATUS_LABEL: Record<string, string> = {
  UNASSIGNED: "Unassigned", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked", REVIEW: "In Review", COMPLETED: "Completed",
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
  const csv = rows.map((row) =>
    row.map((cell) => {
      const str = String(cell ?? "");
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","),
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

function uptimeBarColor(ratio: number | null): string {
  if (ratio == null) return "bg-[#334155]";
  if (ratio >= 99.5) return "bg-emerald-400";
  if (ratio >= 99) return "bg-emerald-500";
  if (ratio >= 95) return "bg-amber-400";
  return "bg-red-400";
}

export default function ReportsPage() {
  const { t } = usePreferences();
  const [tab, setTab] = useState<"tasks" | "system" | "uptime">("tasks");
  const [rangeDays, setRangeDays] = useState<"7" | "30" | "90">("30");
  const [officeId, setOfficeId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [offices, setOffices] = useState<Office[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [system, setSystem] = useState<SystemData | null>(null);
  const [uptime, setUptime] = useState<UptimeData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uptimeRefreshing, setUptimeRefreshing] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ data: Office[] }>("/offices").catch(() => ({ data: [] })),
      api<{ data: Category[] }>("/categories").catch(() => ({ data: [] })),
    ]).then(([o, c]) => { setOffices(o.data); setCategories(c.data); });
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

  const loadUptime = useCallback(async () => {
    const res = await api<{ data: UptimeData }>("/reports/uptime");
    setUptime(res.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        if (tab === "tasks") await loadSummary();
        else if (tab === "system") await loadSystem();
        else await loadUptime();
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, loadSummary, loadSystem, loadUptime]);

  const statusChartData = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.byStatus)
      .map(([status, count]) => ({ status, name: STATUS_LABEL[status] ?? status, count }))
      .sort((a, b) => b.count - a.count);
  }, [summary]);

  const aging = useMemo(() => {
    if (!summary) return null;
    const avgBlocked = summary.blockedTasks.length
      ? summary.blockedTasks.reduce((s, x) => s + x.days, 0) / summary.blockedTasks.length : 0;
    const avgReview = summary.pendingReview.length
      ? summary.pendingReview.reduce((s, x) => s + x.days, 0) / summary.pendingReview.length : 0;
    const overduePct = summary.totalTasks
      ? Math.round((summary.overdueTasks / summary.totalTasks) * 100) : 0;
    return { avgBlocked, avgReview, overduePct };
  }, [summary]);

  const refreshUptime = async () => {
    setUptimeRefreshing(true);
    try { await loadUptime(); } catch { /* error banner handles it */ }
    finally { setUptimeRefreshing(false); }
  };

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
        ["Status Breakdown"], ["Status", "Count"],
        ...statusChartData.map((r) => [r.name, r.count]),
        [],
        ["Team Workload"], ["Member", "Active", "Blocked", "Review", "Total"],
        ...summary.workload.map((w) => [w.name, w.active, w.blocked, w.review, w.total]),
        [],
        ["Blocked Tasks"], ["Code", "Title", "Owner", "Reason", "Days Blocked"],
        ...summary.blockedTasks.map((b) => [b.code, b.title, b.owner, b.reason ?? "—", b.days]),
        [],
        ["Pending Review"], ["Code", "Title", "Owner", "Days Waiting"],
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
        ["Recent Events"], ["Actor", "Role", "Action", "Time"],
        ...system.recentEvents.map((e) => [e.actor, e.actorRole ?? "—", e.action, new Date(e.createdAt).toLocaleString()]),
      ];
      downloadCSV(`hawl-system-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } else if (tab === "uptime" && uptime && uptime.mode === "data") {
      const rows: (string | number)[][] = [
        ["HAWL Uptime Report"],
        ["Generated", new Date().toLocaleString()],
        [],
        ["Monitor", "URL", "Status", "24h %", "7d %", "30d %", "Avg response (ms)"],
        ...uptime.monitors.map((m) => [
          m.name, m.url ?? "—", m.status,
          m.uptime.day ?? "—", m.uptime.week ?? "—", m.uptime.month ?? "—",
          m.avgResponseMs ?? "—",
        ]),
      ];
      downloadCSV(`hawl-uptime-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 space-y-6 pb-12">
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-black text-black">HAWL Institutional Report</h1>
        <p className="text-sm text-gray-600 mt-1">
          {tab === "tasks" ? `Task Analytics — Last ${rangeDays} days`
            : tab === "system" ? "System Health" : "Uptime & Availability"}{" "}
          · Generated <span suppressHydrationWarning>{new Date().toLocaleString()}</span>
        </p>
      </div>

      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">Insights</p>
          <h1 className="mt-1 text-3xl font-black text-white">{t("reports.title")}</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">{t("reports.subtitle")}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#334155] transition w-full sm:w-auto"
          >
            <FileDown size={16} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#e8bc69] px-4 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition w-full sm:w-auto"
          >
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </header>

      <div role="tablist" className="flex items-center gap-1 rounded-xl border border-[#334155] bg-[#0F172A] p-1 w-fit max-w-full overflow-x-auto print:hidden">
        <button
          role="tab" aria-selected={tab === "tasks"} onClick={() => setTab("tasks")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition whitespace-nowrap ${
            tab === "tasks" ? "bg-[#1E293B] text-white shadow-sm" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <BarChart3 size={16} /> Task Analytics
        </button>
        <button
          role="tab" aria-selected={tab === "system"} onClick={() => setTab("system")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition whitespace-nowrap ${
            tab === "system" ? "bg-[#1E293B] text-white shadow-sm" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Activity size={16} /> System Health
        </button>
        <button
          role="tab" aria-selected={tab === "uptime"} onClick={() => setTab("uptime")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition whitespace-nowrap ${
            tab === "uptime" ? "bg-[#1E293B] text-white shadow-sm" : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Globe size={16} /> Uptime & SLA
        </button>
      </div>

      {tab === "tasks" && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 print:hidden">
          <select value={rangeDays} onChange={(e) => setRangeDays(e.target.value as "7" | "30" | "90")}
            className="w-full sm:w-auto rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[#e8bc69]">
            {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={officeId} onChange={(e) => setOfficeId(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[#e8bc69]">
            <option value="">All Offices</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-[#e8bc69]">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
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
            <KpiCard icon={BarChart3} label="Total Tasks" value={summary.totalTasks} color="text-white" />
            <KpiCard icon={CheckCircle2} label="Completion Rate" value={`${summary.completionRate}%`} color="text-emerald-400" sub={`${summary.completed} completed`} />
            <KpiCard icon={Clock} label="Overdue" value={summary.overdueTasks} color="text-red-400" sub={`${summary.dueSoonTasks} due in 3 days`} />
            <KpiCard icon={ArrowUpRight} label="On-Time Rate" value={`${summary.onTimeRate}%`} color="text-[#e8bc69]" sub={`Avg ${summary.avgCompletionDays}d to complete`} />
          </section>

          {aging && (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard icon={Ban} label="Avg Blocked Age" value={`${aging.avgBlocked.toFixed(1)}d`} color="text-red-400" sub={`${summary.blockedTasks.length} blocked`} />
              <KpiCard icon={Inbox} label="Avg Review Wait" value={`${aging.avgReview.toFixed(1)}d`} color="text-violet-400" sub={`${summary.pendingReview.length} pending`} />
              <KpiCard icon={AlertCircle} label="Overdue Share" value={`${aging.overduePct}%`} color="text-amber-400" sub={`${summary.overdueTasks} of ${summary.totalTasks}`} />
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-6">
              <h2 className="text-lg font-bold text-white mb-1">Workflow Distribution</h2>
              <p className="text-xs text-[#94A3B8] mb-4">Tasks by current status</p>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {statusChartData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#64748B"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 12, color: "white" }} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-6">
              <h2 className="text-lg font-bold text-white mb-1">Activity Timeline</h2>
              <p className="text-xs text-[#94A3B8] mb-4">Tasks created vs. completed (last 30 days)</p>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} stroke="#334155" />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} stroke="#334155" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 12, color: "white" }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                    <Line type="monotone" dataKey="created" name="Created" stroke="#E8BC69" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke="#34D399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-6">
            <h2 className="text-lg font-bold text-white mb-1">Team Workload</h2>
            <p className="text-xs text-[#94A3B8] mb-4">Active tasks per team member</p>
            {summary.workload.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#94A3B8]">No active tasks assigned yet.</p>
            ) : (
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.workload} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 10 }} stroke="#334155" interval={0} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#64748B", fontSize: 11 }} stroke="#334155" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: 12, color: "white" }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                    <Bar dataKey="active" name="Active" stackId="s" fill="#E8BC69" />
                    <Bar dataKey="blocked" name="Blocked" stackId="s" fill="#F87171" />
                    <Bar dataKey="review" name="In Review" stackId="s" fill="#A78BFA" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Blocked + Pending — single responsive card layout at every breakpoint. No table. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-6">
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
                <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                  {summary.blockedTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block rounded-lg border border-[#334155] bg-[#0F172A] p-3 hover:border-red-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono text-[#64748B] truncate">{task.code}</span>
                        <span className="text-[10px] font-bold text-red-400 shrink-0">{task.days}d</span>
                      </div>
                      <p className="text-sm font-bold text-white truncate" title={task.title}>{task.title}</p>
                      <p className="text-xs text-[#94A3B8] truncate mt-0.5" title={`${task.owner}${task.reason ? ` · ${task.reason}` : ""}`}>
                        {task.owner}{task.reason ? ` · ${task.reason}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-6">
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
                <p className="py-8 text-center text-sm text-[#94A3B8]">Nothing awaiting approval.</p>
              ) : (
                <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                  {summary.pendingReview.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block rounded-lg border border-[#334155] bg-[#0F172A] p-3 hover:border-violet-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono text-[#64748B] truncate">{task.code}</span>
                        <span className="text-[10px] font-bold text-violet-400 shrink-0">{task.days}d</span>
                      </div>
                      <p className="text-sm font-bold text-white truncate" title={task.title}>{task.title}</p>
                      <p className="text-xs text-[#94A3B8] truncate mt-0.5">{task.owner}</p>
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
            <KpiCard icon={UsersIcon} label="Active Accounts" value={system.activeUsers} color="text-emerald-400" sub={`${system.inactiveUsers} inactive`} />
            <KpiCard icon={BarChart3} label="New Tasks (7d)" value={system.newTasks7d} color="text-white" />
            <KpiCard icon={ShieldAlert} label="Failed Logins (24h)" value={system.failedLogins24h} color="text-amber-400" />
            <KpiCard icon={Lock} label="Locked Accounts" value={system.lockedAccounts} color="text-red-400" />
          </section>

          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-6">
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
                          <code className="rounded bg-[#0F172A] px-2 py-0.5 text-[11px] text-[#e8bc69]">{e.action}</code>
                        </td>
                        <td className="py-2.5 text-[#94A3B8] text-xs">
                          <span suppressHydrationWarning>{new Date(e.createdAt).toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : tab === "uptime" && uptime ? (
        <div className="space-y-6">
          {uptime.mode === "none" && (
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="p-3 rounded-xl border border-[#e8bc69]/20 bg-[#e8bc69]/10 shrink-0">
                  <Globe className="text-[#e8bc69]" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-white">Live status monitoring isn&apos;t available yet</h2>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    Availability data will appear here once your administrator connects an UptimeRobot status page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {uptime.mode === "link" && uptime.statusPageUrl && (
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 rounded-xl border border-[#e8bc69]/20 bg-[#e8bc69]/10 shrink-0">
                  <Globe className="text-[#e8bc69]" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-white">Live uptime status</h2>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    Real-time availability, response time, and incident history are published on the HAWL status page.
                  </p>
                </div>
                <a
                  href={uptime.statusPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-4 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition shrink-0 w-full sm:w-auto justify-center"
                >
                  Open status page <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {uptime.mode === "data" && uptime.overall && (
            <>
              <div
                className={`rounded-2xl border p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  uptime.overall.monitorsDown > 0
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  {uptime.overall.monitorsDown > 0 ? (
                    <WifiOff className="text-red-400 shrink-0" size={22} />
                  ) : (
                    <Wifi className="text-emerald-400 shrink-0" size={22} />
                  )}
                  <div>
                    <p className="text-sm font-black text-white">
                      {uptime.overall.monitorsDown > 0
                        ? `${uptime.overall.monitorsDown} of ${uptime.overall.totalMonitors} monitors are down`
                        : "All monitored services are operational"}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Snapshot generated <span suppressHydrationWarning>{new Date(uptime.generatedAt).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uptime.statusPageUrl && (
                    <a
                      href={uptime.statusPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1E293B] px-3 py-2 text-xs font-bold text-white hover:bg-[#334155] transition"
                    >
                      Status page <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={refreshUptime}
                    disabled={uptimeRefreshing}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-3 py-2 text-xs font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={uptimeRefreshing ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>
              </div>

              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  icon={Gauge}
                  label="30d Uptime"
                  value={uptime.overall.uptime30d != null ? `${uptime.overall.uptime30d.toFixed(2)}%` : "—"}
                  color={uptime.overall.uptime30d == null ? "text-white" : uptime.overall.uptime30d >= 99.5 ? "text-emerald-400" : uptime.overall.uptime30d >= 99 ? "text-amber-400" : "text-red-400"}
                />
                <KpiCard icon={Server} label="Monitors" value={uptime.overall.totalMonitors} color="text-white" sub={`${uptime.overall.monitorsDown} down`} />
                <KpiCard icon={Timer} label="Avg Response" value={uptime.overall.avgResponseMs != null ? `${uptime.overall.avgResponseMs}ms` : "—"} color="text-[#e8bc69]" />
                <KpiCard icon={Activity} label="Healthy" value={uptime.monitors.filter((m) => m.status === "up").length} color="text-emerald-400" sub={`of ${uptime.monitors.length}`} />
              </section>

              <div className="space-y-3">
                {uptime.monitors.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            m.status === "up" ? "bg-emerald-400"
                              : m.status === "down" ? "bg-red-400"
                              : m.status === "paused" ? "bg-[#64748B]"
                              : "bg-amber-400"
                          }`} />
                          <h3 className="font-bold text-white truncate">{m.name}</h3>
                        </div>
                        {m.url && <p className="text-[11px] text-[#64748B] truncate mt-0.5">{m.url}</p>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] shrink-0">
                        {m.avgResponseMs != null && <span>{m.avgResponseMs}ms avg</span>}
                        {m.lastDownAt && <span suppressHydrationWarning>last down {new Date(m.lastDownAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {([
                        { key: "day", label: "24h", value: m.uptime.day },
                        { key: "week", label: "7d", value: m.uptime.week },
                        { key: "month", label: "30d", value: m.uptime.month },
                      ] as const).map((row) => (
                        <div key={row.key} className="min-w-0">
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#94A3B8] mb-1">
                            <span>{row.label}</span>
                            <span className="text-white">{row.value != null ? `${row.value.toFixed(2)}%` : "—"}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#0F172A] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${uptimeBarColor(row.value)}`}
                              style={{ width: `${Math.max(0, Math.min(100, row.value ?? 0))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, color, sub,
}: { icon: LucideIcon; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-4 md:p-5">
      <div className="flex items-center gap-2 mb-2 md:mb-3">
        <Icon size={16} className={color} />
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] leading-tight">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1">{sub}</p>}
    </div>
  );
}
