"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { useBoardRealtime } from "@/lib/realtime";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  Inbox,
  Paperclip,
  UploadCloud,
} from "lucide-react";

// ── API shapes ─────────────────────────────────────────────────
type Report = {
  id: string;
  reportDate: string;
  body: string;
  submittedAt: string;
  late: boolean;
  attachmentUrl?: string; // Added this
};

type MyReportState = {
  today: string;
  requiredToday: boolean;
  deadline: string;
  report: Report | null;
  history: Report[];
};

type CoordinatorStatus = {
  id: string;
  fullName: string;
  role: string;
  office: { name: string } | null;
  status: "SUBMITTED" | "LATE" | "MISSING" | "NOT_REQUIRED";
  report: Report | null;
};

type OverviewState = {
  date: string;
  required: boolean;
  deadline: string;
  coordinators: CoordinatorStatus[];
};

const MAX_LEN = 2000;

const STATUS_STYLE: Record<CoordinatorStatus["status"], string> = {
  SUBMITTED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  LATE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  MISSING: "bg-red-500/10 text-red-500 border-red-500/20",
  NOT_REQUIRED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};
const STATUS_LABEL: Record<CoordinatorStatus["status"], string> = {
  SUBMITTED: "Submitted",
  LATE: "Submitted late",
  MISSING: "Not submitted",
  NOT_REQUIRED: "Not required (Friday)",
};
const ROLE_LABEL: Record<string, string> = {
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
};

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Mogadishu",
});
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const prettyDate = (yyyyMmDd: string) => dateFmt.format(new Date(`${yyyyMmDd}T12:00:00Z`));

export default function DailyReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: User }>("/auth/me")
      .then((r) => setUser(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your account."));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!user) return <Loading />;

  if (user.role === "FACULTY_COORDINATOR" || user.role === "LABS_COORDINATOR") {
    return <CoordinatorView />;
  }
  if (user.role === "DEAN" || user.role === "DEPUTY") {
    return <OverviewView />;
  }

  // Fallback for roles that don't submit/review (e.g. Admin, Lab Tech)
  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="rounded-3xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155] shadow-inner">
          <Inbox className="h-8 w-8 text-[#64748B]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-[#94A3B8] max-w-md mx-auto leading-relaxed">
          Daily reports are only accessible to <strong>Faculty Coordinators</strong>,{" "}
          <strong>Labs Coordinators</strong>, the <strong>Dean</strong>, and the{" "}
          <strong>Deputy Dean</strong>. Your current role ({user.role.replace(/_/g, " ")}) does not
          have access to this page.
        </p>
      </div>
    </div>
  );
}

// ── Coordinator: write today's report ──────────────────────────
function CoordinatorView() {
  const [state, setState] = useState<MyReportState | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ data: MyReportState }>("/daily-reports/me");
      setState(res.data);
      setBody(res.data.report?.body ?? "");
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your report.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api("/daily-reports/me", {
        method: "PUT",
        body: JSON.stringify({
          body,
          attachmentUrl: attachment ? `uploads/${attachment.name}` : undefined,
        }),
      });
      setSaved(true);
      setAttachment(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your report.");
    } finally {
      setBusy(false);
    }
  }

  if (!state && !error) return <Loading />;
  if (!state) return <Notice tone="error">{error}</Notice>;

  const pastDeadline = new Date() > new Date(state.deadline);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Header
        title="Daily Report"
        subtitle={prettyDate(state.today)}
        onRefresh={() => void load()}
      />

      <div className="rounded-2xl border border-border bg-panel p-5 text-sm text-muted">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p>
            {state.requiredToday ? (
              <>
                Your academic report is due every day by{" "}
                <strong className="text-primary">{timeFmt.format(new Date(state.deadline))}</strong>{" "}
                (Hargeisa time), except Fridays.
              </>
            ) : (
              <>No report is required today (Friday). You can still submit one if you wish.</>
            )}
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-border bg-panel p-5 shadow-sm"
      >
        {error && <Notice tone="error">{error}</Notice>}

        <div className="space-y-2">
          <label
            htmlFor="report-body"
            className="text-[10px] font-bold uppercase tracking-wider text-muted"
          >
            Today&apos;s academic report
          </label>
          <textarea
            id="report-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value.slice(0, MAX_LEN));
              setSaved(false);
            }}
            rows={6}
            placeholder="Briefly summarise today's academic activities, issues that need attention, and plans for tomorrow…"
            className="w-full rounded-xl border border-border bg-app px-4 py-3 text-sm text-primary outline-none transition focus:border-accent"
          />
        </div>

        {/* File Upload Area */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Attach Document (Optional)
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-app/50 p-4 transition hover:border-accent/50 hover:bg-app">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <UploadCloud size={20} />
            </div>
            <div className="flex-1">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-sm font-bold text-primary hover:text-accent"
              >
                {attachment ? attachment.name : "Click to upload a file"}
              </label>
              <p className="text-xs text-muted mt-1">PDF, DOCX, or XLSX up to 5MB</p>
            </div>
            {attachment && (
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-xs font-bold text-red-400 hover:text-red-500"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="text-xs text-muted">
            {body.length}/{MAX_LEN}
            {state.report?.late && " · submitted after the deadline"}
          </span>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
            <button
              type="submit"
              disabled={busy || body.trim().length < 10}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text transition hover:bg-accent/90 disabled:opacity-50"
            >
              {busy ? "Saving…" : state.report ? "Update report" : "Submit report"}
            </button>
          </div>
        </div>

        {!state.report && pastDeadline && state.requiredToday && (
          <p className="text-xs font-bold text-amber-500">
            The deadline has passed — this report will be marked as late.
          </p>
        )}
      </form>

      {state.history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-muted">Recent reports</h2>
          <div className="grid gap-3">
            {state.history.map((r) => (
              <details
                key={r.id}
                className="group rounded-2xl border border-border bg-panel overflow-hidden transition-all duration-200 open:border-accent/40 open:shadow-md open:shadow-accent/5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 hover:bg-app/50 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">{prettyDate(r.reportDate)}</span>
                    {r.attachmentUrl && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                        <Paperclip size={10} /> Attachment
                      </span>
                    )}
                    {r.late && (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-500">
                        Late
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="border-t border-border bg-app/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary">
                    {r.body}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Dean / Deputy: Overview with Search & Filter ───────────────
function OverviewView() {
  const [date, setDate] = useState("");
  const [state, setState] = useState<OverviewState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | CoordinatorStatus["status"]>("ALL");

  const load = useCallback(async (d?: string) => {
    try {
      const res = await api<{ data: OverviewState }>(`/daily-reports${d ? `?date=${d}` : ""}`);
      setState(res.data);
      setDate(res.data.date);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load reports.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useBoardRealtime(() => {
    void load(date);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(date);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [load, date]);

  const filteredCoordinators = useMemo(() => {
    if (!state) return [];
    return state.coordinators.filter((c) => {
      const matchesSearch =
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (c.office?.name || "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || c.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [state, search, filter]);

  const counts = useMemo(() => {
    const c = { SUBMITTED: 0, LATE: 0, MISSING: 0, NOT_REQUIRED: 0 };
    state?.coordinators.forEach((x) => (c[x.status] += 1));
    return c;
  }, [state]);

  if (!state && !error) return <Loading />;
  if (!state) return <Notice tone="error">{error}</Notice>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Header
        title="Coordinator Daily Reports"
        subtitle={prettyDate(state.date)}
        onRefresh={() => void load(date)}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-panel p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="report-date"
              className="text-[10px] font-bold uppercase tracking-wider text-muted"
            >
              Date
            </label>
            <input
              id="report-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (e.target.value) void load(e.target.value);
              }}
              className="rounded-xl border border-border bg-app px-3 py-1.5 text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 text-xs text-muted border-l border-border pl-3">
            <span>{counts.SUBMITTED + counts.LATE} submitted</span>·
            <span>{counts.MISSING} missing</span>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search coordinator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-app pl-9 pr-3 py-2 text-sm text-primary placeholder-muted outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "SUBMITTED", "LATE", "MISSING"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filter === tab
                ? "bg-accent text-accent-text shadow-sm"
                : "bg-panel border border-border text-muted hover:text-primary hover:border-accent/50"
            }`}
          >
            {tab === "ALL" ? "All Coordinators" : STATUS_LABEL[tab]}
          </button>
        ))}
      </div>

      {!state.required && <Notice tone="info">Friday: daily reports are not required.</Notice>}

      {filteredCoordinators.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155] shadow-inner">
            <Inbox className="h-8 w-8 text-[#64748B]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {search || filter !== "ALL" ? "No results found" : "No coordinators yet"}
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
            {search || filter !== "ALL"
              ? "Try adjusting your search or filters to find what you're looking for."
              : "There are no coordinator accounts to display at this time."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCoordinators.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border bg-panel p-5 transition hover:border-accent/30 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-primary text-lg">{c.fullName}</p>
                  <p className="text-xs text-muted font-medium">
                    {ROLE_LABEL[c.role] ?? c.role}
                    {c.office?.name ? ` · ${c.office.name}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                  {c.report && ` · ${timeFmt.format(new Date(c.report.submittedAt))}`}
                </span>
              </div>

              {c.report && (
                <div className="mt-4 rounded-xl bg-app/50 p-4 border border-border/50">
                  <p className="whitespace-pre-wrap text-sm text-primary leading-relaxed">
                    {c.report.body}
                  </p>
                  {c.report.attachmentUrl && (
                    <div className="mt-3 flex items-center gap-1 text-xs font-bold text-accent hover:underline cursor-pointer">
                      <Paperclip size={12} /> View Attached Document
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({
  title,
  subtitle,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-accent">
          <FileText className="h-3.5 w-3.5" /> CECIT
        </p>
        <h1 className="mt-1 text-3xl font-black text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh"
        className="rounded-xl border border-border bg-panel p-2.5 text-muted transition hover:text-primary hover:bg-app"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  const style =
    tone === "error"
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-border bg-panel text-muted";
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-bold ${style}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
