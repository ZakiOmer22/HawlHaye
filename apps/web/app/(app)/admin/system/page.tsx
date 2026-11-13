"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import type { User } from "@/lib/types";
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  AlertCircle,
  Zap,
  Loader2,
  Settings2,
  Printer,
  FileText,
  Globe,
  TerminalSquare,
  Download,
  FileSpreadsheet,
  ChevronDown,
  FileDown,
  LayoutGrid,
  ListChecks,
  FileBarChart,
  Users,
  Search,
  X,
} from "lucide-react";

type ServiceStatus = "up" | "down" | "not_configured";

type SystemLogEntry = {
  id: string;
  action: string;
  entityType: string;
  actorName: string;
  ip: string;
  timestamp: string;
};

type SystemHealth = {
  status: "healthy" | "degraded" | "down";
  uptime: number;
  environment: string;
  nodeVersion: string;
  metrics: {
    cpuUsage: number;
    memoryUsed: number;
    memoryTotal: number;
    diskUsed: number;
    diskTotal: number;
  };
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    api: ServiceStatus;
  };
  recentLogs: SystemLogEntry[];
  osInfo: {
    platform: string;
    arch: string;
    hostname: string;
    cores: number;
  };
};

export default function SystemHealthPage() {
  const { t } = usePreferences();
  const [data, setData] = useState<SystemHealth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // UI Toggles
  const [showServices, setShowServices] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showLogs, setShowLogs] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Log Filtering State
  const [logSearch, setLogSearch] = useState("");
  const [logFilterAction, setLogFilterAction] = useState("ALL");
  const [logFilterActor, setLogFilterActor] = useState("ALL");

  const exportMenuRef = useRef<HTMLDivElement>(null);

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [healthRes, meRes] = await Promise.all([
        api<{ data: SystemHealth }>("/admin/system/health"),
        api<{ data: User }>("/auth/me"),
      ]);
      setData(healthRes.data);
      setUser(meRes.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (!silent)
        setError(err instanceof ApiError ? err.message : "Failed to load system health.");
    } finally {
      if (!silent) setLoading(false);
      else setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  // REAL-TIME POLLING
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void fetchHealth(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Click outside to close export menu
  useEffect(() => {
    if (!isExportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isExportOpen]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // ── Filter Logic ──────────────────────────────────────────────
  const logs = data?.recentLogs || [];

  const uniqueActions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs],
  );
  const uniqueActors = useMemo(
    () => Array.from(new Set(logs.map((l) => l.actorName))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = logSearch.toLowerCase();
      const matchesSearch =
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.ip.toLowerCase().includes(q);
      const matchesAction = logFilterAction === "ALL" || log.action === logFilterAction;
      const matchesActor = logFilterActor === "ALL" || log.actorName === logFilterActor;
      return matchesSearch && matchesAction && matchesActor;
    });
  }, [logs, logSearch, logFilterAction, logFilterActor]);
  // ──────────────────────────────────────────────────────────────

  // ── EXPORT LOGIC ──────────────────────────────────────────────
  const exportPDF = () => {
    if (!data || !user) return;
    setIsExportOpen(false);

    const html = `
      <html>
        <head>
          <title>System Health Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; padding: 40px; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 5px 0 0; color: #6b7280; font-size: 14px; }
            .meta { text-align: right; font-size: 12px; color: #6b7280; }
            h2 { font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
            th { background-color: #f9fafb; font-weight: 600; color: #374151; }
            .status { font-weight: 700; text-transform: uppercase; }
            .status-healthy { color: #059669; }
            .status-degraded { color: #d97706; }
            .status-down { color: #dc2626; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>System Health Report</h1>
              <p>HAWLHAYE · CECIT Task Management System</p>
            </div>
            <div class="meta">
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Institution:</strong> University of Hargeisa</p>
              <p><strong>Generated By:</strong> ${user.fullName} (${user.role})</p>
            </div>
          </div>

          <h2>Overall Status</h2>
          <table>
            <tr><th style="width: 30%;">Status</th><td class="status status-${data.status}">${data.status}</td></tr>
            <tr><th>Uptime</th><td>${formatUptime(data.uptime)}</td></tr>
            <tr><th>Environment</th><td>${data.environment}</td></tr>
            <tr><th>Server Runtime</th><td>${data.nodeVersion}</td></tr>
          </table>

          <h2>Services Status</h2>
          <table>
            <tr><th>Service</th><th>Status</th></tr>
            <tr><td>API Gateway</td><td>${data.services.api}</td></tr>
            <tr><td>Database (Prisma)</td><td>${data.services.database}</td></tr>
            <tr><td>Cache / Redis</td><td>${data.services.cache}</td></tr>
          </table>

          <h2>Resource Metrics</h2>
          <table>
            <tr><th>Resource</th><th>Used</th><th>Total</th></tr>
            <tr><td>CPU</td><td>${data.metrics.cpuUsage}%</td><td>100%</td></tr>
            <tr><td>Memory</td><td>${data.metrics.memoryUsed.toFixed(2)} GB</td><td>${data.metrics.memoryTotal.toFixed(2)} GB</td></tr>
            <tr><td>Disk</td><td>${data.metrics.diskUsed.toFixed(2)} GB</td><td>${data.metrics.diskTotal.toFixed(2)} GB</td></tr>
          </table>

          <h2>Recent Activity Logs</h2>
          ${
            data.recentLogs.length === 0
              ? "<p>No recent logs.</p>"
              : `
            <table>
              <tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th><th>IP</th></tr>
              ${data.recentLogs
                .map(
                  (log) => `
                <tr>
                  <td>${new Date(log.timestamp).toLocaleString()}</td>
                  <td>${log.action}</td>
                  <td>${log.entityType}</td>
                  <td>${log.actorName}</td>
                  <td>${log.ip}</td>
                </tr>
              `,
                )
                .join("")}
            </table>
          `
          }

          <div class="footer">
            This document was generated automatically by HAWLHAYE. For security inquiries, contact security@cecit.edu.so
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 250);
    }
  };

  const exportExcel = () => {
    if (!data) return;
    setIsExportOpen(false);

    let csv = "HAWLHAYE - System Health Report\n";
    csv += `Generated By,${user?.fullName || "Admin"}\n`;
    csv += `Date,${new Date().toLocaleString()}\n\n`;

    csv += "Overall Status,Value\n";
    csv += `Status,${data.status}\n`;
    csv += `Uptime,${formatUptime(data.uptime)}\n`;
    csv += `Environment,${data.environment}\n`;
    csv += `Server Runtime,${data.nodeVersion}\n\n`;

    csv += "Services,Status\n";
    csv += `API Gateway,${data.services.api}\n`;
    csv += `Database,${data.services.database}\n`;
    csv += `Cache/Redis,${data.services.cache}\n\n`;

    csv += "Metrics,Used,Total\n";
    csv += `CPU,${data.metrics.cpuUsage}%,100%\n`;
    csv += `Memory,${data.metrics.memoryUsed.toFixed(2)} GB,${data.metrics.memoryTotal.toFixed(2)} GB\n`;
    csv += `Disk,${data.metrics.diskUsed.toFixed(2)} GB,${data.metrics.diskTotal.toFixed(2)} GB\n\n`;

    csv += "Recent Logs\n";
    csv += "Timestamp,Action,Entity,Actor,IP\n";
    data.recentLogs.forEach((log) => {
      csv += `"${new Date(log.timestamp).toLocaleString()}","${log.action}","${log.entityType}","${log.actorName}","${log.ip}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `System_Health_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportWord = () => {
    if (!data) return;
    setIsExportOpen(false);

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>System Health Report</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; color: #111; }
          .header-table { width: 100%; border-collapse: collapse; border: none; margin-bottom: 20px; }
          .header-table td { border: none; padding: 0; vertical-align: top; }
          .logo { max-width: 120px; height: auto; }
          .title { font-size: 24px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 14px; color: #6b7280; margin: 5px 0 0 0; }
          .meta { font-size: 12px; color: #6b7280; text-align: right; }
          .meta p { margin: 3px 0; }
          .divider { border-top: 2px solid #e5e7eb; margin: 20px 0; }
          h2 { font-size: 16px; font-weight: 600; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 13px; }
          th { background-color: #f9fafb; font-weight: 600; }
          .status-healthy { color: #059669; font-weight: bold; text-transform: uppercase; }
          .status-degraded { color: #d97706; font-weight: bold; text-transform: uppercase; }
          .status-down { color: #dc2626; font-weight: bold; text-transform: uppercase; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 20%;">
              <img src="https://cecit.edu.so/uoh.png" alt="University of Hargeisa" class="logo" />
            </td>
            <td style="width: 50%;">
              <h1 class="title">System Health Report</h1>
              <p class="subtitle">HAWLHAYE · CECIT Task Management System</p>
            </td>
            <td style="width: 30%;" class="meta">
              <p><strong>Institution:</strong> University of Hargeisa</p>
              <p><strong>Generated By:</strong> ${user?.fullName || "Admin"}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </td>
          </tr>
        </table>

        <div class="divider"></div>

        <h2>Overall Status</h2>
        <table>
          <tr><th style="width: 30%;">Status</th><td class="status-${data.status}">${data.status}</td></tr>
          <tr><th>Uptime</th><td>${formatUptime(data.uptime)}</td></tr>
          <tr><th>Environment</th><td>${data.environment}</td></tr>
          <tr><th>Server Runtime</th><td>${data.nodeVersion}</td></tr>
        </table>

        <h2>Services Status</h2>
        <table>
          <tr><th>Service</th><th>Status</th></tr>
          <tr><td>API Gateway</td><td>${data.services.api}</td></tr>
          <tr><td>Database (Prisma)</td><td>${data.services.database}</td></tr>
          <tr><td>Cache / Redis</td><td>${data.services.cache}</td></tr>
        </table>

        <h2>Resource Metrics</h2>
        <table>
          <tr><th>Resource</th><th>Used</th><th>Total</th></tr>
          <tr><td>CPU</td><td>${data.metrics.cpuUsage}%</td><td>100%</td></tr>
          <tr><td>Memory</td><td>${data.metrics.memoryUsed.toFixed(2)} GB</td><td>${data.metrics.memoryTotal.toFixed(2)} GB</td></tr>
          <tr><td>Disk</td><td>${data.metrics.diskUsed.toFixed(2)} GB</td><td>${data.metrics.diskTotal.toFixed(2)} GB</td></tr>
        </table>

        <h2>Recent Activity Logs</h2>
        ${
          data.recentLogs.length === 0
            ? "<p>No recent logs.</p>"
            : `
          <table>
            <tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th><th>IP</th></tr>
            ${data.recentLogs
              .map(
                (log) => `
              <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.action}</td>
                <td>${log.entityType}</td>
                <td>${log.actorName}</td>
                <td>${log.ip}</td>
              </tr>
            `,
              )
              .join("")}
          </table>
        `
        }

        <div class="footer">
          <p>This document was generated automatically by HAWLHAYE.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `System_Health_${new Date().toISOString().split("T")[0]}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-primary mb-2">{t("error.generic")}</h2>
        <p className="text-secondary mb-6">{error || "Could not fetch system health data."}</p>
        <button
          onClick={() => fetchHealth()}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  // Chart calculations
  const memPercent =
    data.metrics.memoryTotal > 0
      ? Math.round((data.metrics.memoryUsed / data.metrics.memoryTotal) * 100)
      : 0;
  const diskPercent =
    data.metrics.diskTotal > 0
      ? Math.round((data.metrics.diskUsed / data.metrics.diskTotal) * 100)
      : 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6 pb-12">
      {/* Header - Fixed Dropdown Clipping */}
      <header className="rounded-2xl border border-border bg-gradient-to-br from-panel via-panel to-app p-4 sm:p-6 md:p-8 relative z-40 shadow-sm">
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.22em] text-accent truncate flex items-center gap-2">
              <Activity size={14} /> {t("system.title")}
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black text-primary leading-tight break-words">
              System Health & Infrastructure
            </h1>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-secondary">
              {t("system.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0 mt-2 xl:mt-0 relative">
            <span className="text-xs font-bold text-muted hidden md:inline-block mr-2">
              {t("system.updated", { time: lastUpdated.toLocaleTimeString() })}
            </span>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 py-2.5 text-xs sm:text-sm font-bold text-primary hover:bg-app transition shadow-sm"
              >
                <Download size={16} />
                Export
                <ChevronDown
                  size={14}
                  className={`transition-transform ${isExportOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isExportOpen && (
                <div className="absolute top-12 right-0 z-[100] w-48 rounded-xl border border-border bg-panel p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={exportPDF}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-secondary hover:bg-app hover:text-primary transition"
                  >
                    <Printer size={16} /> Export to PDF
                  </button>
                  <button
                    onClick={exportExcel}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-secondary hover:bg-app hover:text-primary transition"
                  >
                    <FileSpreadsheet size={16} /> Export to Excel
                  </button>
                  <button
                    onClick={exportWord}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-secondary hover:bg-app hover:text-primary transition"
                  >
                    <FileDown size={16} /> Export to Word
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => fetchHealth(true)}
              disabled={isRefreshing}
              className="flex items-center justify-center rounded-xl border border-border bg-panel p-2.5 text-muted hover:text-primary transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>

            {/* Customize Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCustomizing(!isCustomizing)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-sm ${
                  isCustomizing
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "border-border bg-panel text-primary hover:bg-app"
                }`}
              >
                <Settings2 size={16} />
                <span className="hidden sm:inline">Customize</span>
              </button>

              {isCustomizing && (
                <div className="absolute top-12 right-0 z-[100] w-56 rounded-xl border border-border bg-panel p-3 shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                    Visible Sections
                  </h3>
                  <div className="space-y-2">
                    <ToggleRow
                      label="Services"
                      checked={showServices}
                      onChange={() => setShowServices(!showServices)}
                    />
                    <ToggleRow
                      label="Metrics"
                      checked={showMetrics}
                      onChange={() => setShowMetrics(!showMetrics)}
                    />
                    <ToggleRow
                      label="Logs"
                      checked={showLogs}
                      onChange={() => setShowLogs(!showLogs)}
                    />
                    <ToggleRow
                      label="OS Info"
                      checked={showInfo}
                      onChange={() => setShowInfo(!showInfo)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Top KPI Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 relative z-10">
        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted mb-2">
            Overall Status
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${data.status === "healthy" ? "bg-emerald-500" : data.status === "degraded" ? "bg-amber-500" : "bg-red-500"}`}
            />
            <span className="text-sm sm:text-lg font-black text-primary capitalize">
              {data.status === "healthy"
                ? t("system.status.healthy")
                : data.status === "degraded"
                  ? t("system.status.degraded")
                  : t("system.status.down")}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted mb-2">
            Uptime
          </p>
          <p className="text-sm sm:text-lg font-black text-primary">{formatUptime(data.uptime)}</p>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted mb-2">
            Server Runtime
          </p>
          <p className="text-sm sm:text-lg font-black text-primary capitalize">
            {data.nodeVersion}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted mb-2">
            Environment
          </p>
          <p className="text-sm sm:text-lg font-black text-primary capitalize">
            {data.environment}
          </p>
        </div>
      </section>

      {/* Charts Section (Gold Design) */}
      {showMetrics && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
          <RadialChartCard
            title="CPU Usage"
            icon={Cpu}
            percent={data.metrics.cpuUsage}
            subtitle={`${data.metrics.cpuUsage}% Used`}
          />
          <RadialChartCard
            title="Memory Usage"
            icon={Activity}
            percent={memPercent}
            subtitle={`${data.metrics.memoryUsed.toFixed(1)} GB / ${data.metrics.memoryTotal.toFixed(1)} GB`}
          />
          <RadialChartCard
            title="Disk Storage"
            icon={HardDrive}
            percent={diskPercent}
            subtitle={`${data.metrics.diskUsed.toFixed(1)} GB / ${data.metrics.diskTotal.toFixed(1)} GB`}
          />
        </section>
      )}

      {/* Services Status */}
      {showServices && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 relative z-10">
          <ServiceCard title="API Gateway" icon={Zap} status={data.services.api} />
          <ServiceCard title="Database" icon={Database} status={data.services.database} />
          <ServiceCard title="Cache / Redis" icon={Server} status={data.services.cache} />
        </div>
      )}

      {/* Environment Info */}
      {showInfo && data.osInfo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 relative z-10">
          <InfoCard label="Platform" value={data.osInfo.platform} icon={TerminalSquare} />
          <InfoCard label="Architecture" value={data.osInfo.arch} icon={Cpu} />
          <InfoCard label="Hostname" value={data.osInfo.hostname} icon={Globe} />
          <InfoCard label="CPU Cores" value={`${data.osInfo.cores} Cores`} icon={Activity} />
        </div>
      )}

      {/* Logs Table with Filters */}
      {showLogs && (
        <div className="rounded-2xl border border-border bg-panel shadow-sm overflow-hidden flex flex-col relative z-10">
          {/* Table Header & Toolbar */}
          <div className="p-4 sm:p-5 border-b border-border flex flex-col gap-4 bg-panel">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                {t("system.logs.title")}
              </h3>
              <span className="text-[10px] sm:text-xs font-bold bg-app px-2.5 py-1 rounded-md border border-border text-muted">
                {filteredLogs.length} Results
              </span>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-app ps-9 pe-4 text-xs text-primary placeholder-muted outline-none transition focus:border-accent"
                />
                {logSearch && (
                  <button
                    onClick={() => setLogSearch("")}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                value={logFilterAction}
                onChange={(e) => setLogFilterAction(e.target.value)}
                className="h-9 rounded-lg border border-border bg-app px-3 text-xs text-primary outline-none focus:border-accent w-full sm:w-auto"
              >
                <option value="ALL">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>

              <select
                value={logFilterActor}
                onChange={(e) => setLogFilterActor(e.target.value)}
                className="h-9 rounded-lg border border-border bg-app px-3 text-xs text-primary outline-none focus:border-accent w-full sm:w-auto"
              >
                <option value="ALL">All Actors</option>
                {uniqueActors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-x-auto max-h-[500px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted flex flex-col items-center justify-center">
                <FileText size={32} className="mb-3 opacity-20" />
                No logs found matching your filters.
              </div>
            ) : (
              <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                <thead className="bg-app-soft/50 border-b border-border text-[10px] sm:text-xs uppercase tracking-wider text-muted sticky top-0 z-10">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 font-bold text-start">Time</th>
                    <th className="px-4 sm:px-6 py-3 font-bold text-start">Action</th>
                    <th className="px-4 sm:px-6 py-3 font-bold text-start">Entity</th>
                    <th className="px-4 sm:px-6 py-3 font-bold text-start">Actor</th>
                    <th className="px-4 sm:px-6 py-3 font-bold text-start">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-panel-hover transition-colors">
                      <td className="px-4 sm:px-6 py-3 text-muted">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 font-bold text-primary">{log.action}</td>
                      <td className="px-4 sm:px-6 py-3 text-secondary">{log.entityType}</td>
                      <td className="px-4 sm:px-6 py-3 text-secondary">{log.actorName}</td>
                      <td className="px-4 sm:px-6 py-3 text-secondary">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <section className="rounded-2xl border border-border bg-panel p-4 sm:p-6 md:p-8 shadow-sm relative z-10">
        <h2 className="text-base sm:text-lg font-bold text-primary mb-3 sm:mb-4 flex items-center gap-2">
          <LayoutGrid size={18} aria-hidden="true" className="text-accent shrink-0" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 relative z-20">
          <QuickAction href="/board" icon={<LayoutGrid size={18} />} label="Task Board" />
          <QuickAction href="/admin/users" icon={<Users size={18} />} label="Manage Users" />
          <QuickAction href="/admin/audit" icon={<ListChecks size={18} />} label="Audit Logs" />
          <QuickAction
            href="/admin/settings"
            icon={<FileBarChart size={18} />}
            label="Global Settings"
          />
        </div>
      </section>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button onClick={onChange} className="flex items-center justify-between w-full group">
      <span className="text-xs font-bold text-secondary group-hover:text-primary transition-colors">
        {label}
      </span>
      <div
        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-1"}`}
        />
      </div>
    </button>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 text-muted mb-2">
        <Icon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-black text-primary truncate">{value}</p>
    </div>
  );
}

function ServiceCard({
  title,
  icon: Icon,
  status,
}: {
  title: string;
  icon: React.ElementType;
  status: ServiceStatus;
}) {
  const isUp = status === "up";
  const isNotConfigured = status === "not_configured";

  return (
    <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-app text-muted">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-primary">{title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isUp ? "bg-emerald-500" : isNotConfigured ? "bg-slate-400" : "bg-red-500"}`}
            />
            <p
              className={`text-[10px] font-bold uppercase tracking-wider ${isUp ? "text-emerald-500" : isNotConfigured ? "text-slate-500" : "text-red-500"}`}
            >
              {isUp ? "Operational" : isNotConfigured ? "Not Configured" : "Offline"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gold Radial Chart Component
function RadialChartCard({
  title,
  icon: Icon,
  percent,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  percent: number;
  subtitle: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="rounded-2xl border border-border bg-panel p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex flex-col items-center sm:items-start min-w-0">
        <div className="flex items-center gap-2 mb-2 text-muted">
          <Icon size={16} />
          <h3 className="text-xs sm:text-sm font-bold text-primary truncate">{title}</h3>
        </div>
        <p className="text-sm sm:text-lg font-black text-primary">{percent}%</p>
        <p className="text-[10px] sm:text-xs text-muted font-medium mt-1 truncate">{subtitle}</p>
      </div>

      <div className="relative flex items-center justify-center shrink-0">
        <svg width="90" height="90" className="-rotate-90">
          <circle
            cx="45"
            cy="45"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-app"
          />
          <circle
            cx="45"
            cy="45"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-accent transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xs font-black text-primary">{percent}%</span>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-app p-3 sm:p-4 text-secondary hover:border-accent/50 hover:text-accent transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
    >
      <span className="transition-transform group-hover:scale-110">{icon}</span>
      <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{label}</span>
    </a>
  );
}
