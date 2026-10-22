"use client";

import { useEffect, useState, useMemo } from "react";
import { api, ApiError } from "@/lib/api";
import type { Task } from "@/lib/types";
import { BarChart3, Download, ShieldAlert, Activity, AlertTriangle } from "lucide-react";

// Types for Audit Logs (based on your Prisma schema)
interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { fullName: string; role: string } | null;
  meta?: Record<string, unknown>;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"data" | "system">("data");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch tasks for Data Reports
        const taskRes = await api<{ data: Task[] }>("/tasks?take=1000");
        setTasks(taskRes.data);

        // Fetch audit logs for System Reports
        try {
          const auditRes = await api<{ data: AuditLog[] }>("/audit?take=100");
          setAudits(auditRes.data);
        } catch {
          // Silently fail if audit endpoint isn't built yet
          console.warn("Audit endpoint not ready yet");
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Data Processing for Workload Table ──────────────────────────
  const workloadData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; assigned: number; inProgress: number; completed: number; total: number }
    >();

    tasks.forEach((t) => {
      const ownerName = t.owner?.fullName || "Unassigned";
      if (!map.has(ownerName)) {
        map.set(ownerName, { name: ownerName, assigned: 0, inProgress: 0, completed: 0, total: 0 });
      }
      const entry = map.get(ownerName)!;
      entry.total += 1;
      if (t.status === "ASSIGNED") entry.assigned += 1;
      if (t.status === "IN_PROGRESS" || t.status === "REVIEW" || t.status === "BLOCKED")
        entry.inProgress += 1;
      if (t.status === "COMPLETED") entry.completed += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tasks]);

  // ── Data Processing for Status Chart ────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = {
      UNASSIGNED: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      REVIEW: 0,
      COMPLETED: 0,
    };
    tasks.forEach((t) => counts[t.status]++);
    return counts;
  }, [tasks]);

  const maxStatusCount = Math.max(...Object.values(statusCounts), 1);

  // ── CSV Export Utility ──────────────────────────────────────────
  function downloadCSV(type: "workload" | "audit") {
    let csvContent = "";

    if (type === "workload") {
      csvContent = "Owner,Total Tasks,Assigned,In Progress,Completed\n";
      workloadData.forEach((row) => {
        csvContent += `"${row.name}",${row.total},${row.assigned},${row.inProgress},${row.completed}\n`;
      });
    } else {
      csvContent = "Date,Actor,Role,Action,Target\n";
      audits.forEach((row) => {
        csvContent += `"${new Date(row.createdAt).toLocaleString()}","${row.actor?.fullName || "System"}","${row.actor?.role || "-"}","${row.action}","${row.entityType || "-"}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `HAWLHAYE_${type}_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#334155] border-t-[#e8bc69]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load reports</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            Analytics
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">Reports & Insights</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Export institutional data and monitor system security.
          </p>
        </div>

        <button
          onClick={() => downloadCSV(activeTab === "data" ? "workload" : "audit")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] shadow-lg shadow-[#e8bc69]/20"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#334155] pb-px">
        <button
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === "data"
              ? "border-[#e8bc69] text-[#e8bc69]"
              : "border-transparent text-[#94A3B8] hover:text-white"
          }`}
        >
          <BarChart3 size={16} /> Data Reports
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
            activeTab === "system"
              ? "border-[#e8bc69] text-[#e8bc69]"
              : "border-transparent text-[#94A3B8] hover:text-white"
          }`}
        >
          <ShieldAlert size={16} /> System Audit
        </button>
      </div>

      {/* ── TAB 1: DATA REPORTS ────────────────────────────────── */}
      {activeTab === "data" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
                Total Tasks
              </p>
              <p className="text-3xl font-black text-white">{tasks.length}</p>
            </div>
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
                Completion Rate
              </p>
              <p className="text-3xl font-black text-emerald-400">
                {tasks.length === 0 ? 0 : Math.round((statusCounts.COMPLETED / tasks.length) * 100)}
                %
              </p>
            </div>
            <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
                Blocked Tasks
              </p>
              <p className="text-3xl font-black text-red-400">{statusCounts.BLOCKED}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Distribution Chart */}
            <div className="lg:col-span-1 rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white mb-6">
                Tasks by Status
              </h2>
              <div className="space-y-4">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const percentage = (count / maxStatusCount) * 100;
                  let color = "bg-slate-500";
                  if (status === "IN_PROGRESS") color = "bg-[#e8bc69]";
                  if (status === "COMPLETED") color = "bg-emerald-500";
                  if (status === "BLOCKED") color = "bg-red-500";
                  if (status === "REVIEW") color = "bg-violet-500";

                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-[#94A3B8] capitalize">
                          {status.replace("_", " ").toLowerCase()}
                        </span>
                        <span className="text-white">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#0F172A] overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Workload Table */}
            <div className="lg:col-span-2 rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[#334155]">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Workload by Person
                </h2>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0F172A] text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    <tr>
                      <th className="px-6 py-4">Owner</th>
                      <th className="px-6 py-4 text-center">Assigned</th>
                      <th className="px-6 py-4 text-center">Active</th>
                      <th className="px-6 py-4 text-center">Completed</th>
                      <th className="px-6 py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {workloadData.map((row, i) => (
                      <tr key={i} className="hover:bg-[#0F172A]/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#334155] flex items-center justify-center text-[10px]">
                            {row.name.charAt(0)}
                          </div>
                          {row.name}
                        </td>
                        <td className="px-6 py-4 text-center text-[#A0ABC0]">{row.assigned}</td>
                        <td className="px-6 py-4 text-center text-[#e8bc69]">{row.inProgress}</td>
                        <td className="px-6 py-4 text-center text-emerald-400">{row.completed}</td>
                        <td className="px-6 py-4 text-right font-bold text-white">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SYSTEM AUDIT ────────────────────────────────── */}
      {activeTab === "system" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 flex items-start gap-4">
            <div className="p-3 bg-[#0F172A] rounded-xl border border-[#334155]">
              <Activity className="h-6 w-6 text-[#e8bc69]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">System Audit Trail</h2>
              <p className="text-sm text-[#94A3B8] mt-1">
                An immutable log of all security events, logins, and data changes across the
                platform.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0F172A] text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {audits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[#94A3B8]">
                        No audit logs found or endpoint not yet implemented.
                      </td>
                    </tr>
                  ) : (
                    audits.map((log) => (
                      <tr key={log.id} className="hover:bg-[#0F172A]/50 transition-colors">
                        <td className="px-6 py-4 text-[#A0ABC0] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">
                            {log.actor?.fullName || "System"}
                          </div>
                          <div className="text-[10px] font-bold uppercase text-[#94A3B8]">
                            {log.actor?.role || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0F172A] border border-[#334155] px-2.5 py-1 text-xs font-bold text-[#e8bc69]">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#A0ABC0]">
                          {log.entityType}{" "}
                          <span className="text-[10px] text-[#475569] ml-1">
                            {log.entityId?.slice(0, 8)}...
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
      )}
    </div>
  );
}
