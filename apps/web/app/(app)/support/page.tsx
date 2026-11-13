"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import {
  LifeBuoy,
  Loader2,
  AlertCircle,
  Plus,
  Inbox,
  Clock,
  ArrowRight,
  RefreshCw,
  Send,
  Search,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Ticket = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  replies: { id: string }[];
};

const STATUS_MAP: Record<TicketStatus, TranslationKey> = {
  OPEN: "support.status.open",
  IN_PROGRESS: "support.status.in_progress",
  RESOLVED: "support.status.resolved",
  CLOSED: "support.status.closed",
};

const CATEGORY_MAP: Record<string, TranslationKey> = {
  "Technical Issue": "support.category.technical",
  "Feature Request": "support.category.feature",
  "Account & Access": "support.category.account",
  "Bug Report": "support.category.bug",
  Other: "support.category.other",
};

export default function SupportListPage() {
  const { t } = usePreferences();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string | "ALL">("ALL");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Technical Issue");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await api<{ data: Ticket[] }>(`/tickets?_t=${Date.now()}`);
      setTickets(res.data);
    } catch (err) {
      if (!silent) setError(err instanceof ApiError ? err.message : "Failed to load tickets.");
    } finally {
      if (!silent) setLoading(false);
      else setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void loadTickets(true);
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadTickets(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadTickets]);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("description", message);
      formData.append("category", category);
      formData.append("priority", priority);

      const res = await api<{ data: Ticket }>("/tickets", {
        method: "POST",
        body: formData,
      });

      setTickets([res.data, ...tickets]);
      setIsCreateOpen(false);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create ticket.");
    } finally {
      setBusy(false);
    }
  }

  const statusColor = (status: TicketStatus) => {
    if (status === "OPEN") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (status === "IN_PROGRESS") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (status === "RESOLVED") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || t.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  if (loading && tickets.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight flex items-center gap-3">
            {t("support.title")}
            {isRefreshing && <RefreshCw size={16} className="animate-spin text-muted" />}
          </h1>
          <p className="text-sm text-secondary mt-1">{t("support.subtitle")}</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition shadow-sm w-full sm:w-auto"
        >
          <Plus size={16} /> {t("support.new_ticket")}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6 bg-panel p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-app pl-9 pr-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "ALL")}
            className="rounded-xl border border-border bg-app px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">{t(STATUS_MAP.OPEN)}</option>
            <option value="IN_PROGRESS">{t(STATUS_MAP.IN_PROGRESS)}</option>
            <option value="RESOLVED">{t(STATUS_MAP.RESOLVED)}</option>
            <option value="CLOSED">{t(STATUS_MAP.CLOSED)}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-border bg-app px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
          >
            <option value="ALL">All Categories</option>
            {Object.keys(CATEGORY_MAP).map((cat) => (
              <option key={cat} value={cat}>
                {t(CATEGORY_MAP[cat])}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel p-12 sm:p-16 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="h-20 w-20 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <LifeBuoy className="h-10 w-10 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">{t("support.no_tickets")}</h3>
            <p className="text-sm text-secondary mb-6 max-w-sm">
              No tickets match your search or filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold text-primary hover:bg-app transition shadow-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/${ticket.id}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border border-border bg-panel hover:bg-app/50 transition-colors gap-4 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-muted">
                    #{ticket.id.slice(-6).toUpperCase()}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${statusColor(ticket.status)}`}
                  >
                    {t(STATUS_MAP[ticket.status])}
                  </span>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider bg-app px-2 py-0.5 rounded border border-border">
                    {t(CATEGORY_MAP[ticket.category] || "support.category.other")}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-primary truncate group-hover:text-accent transition-colors">
                  {ticket.subject}
                </h3>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-bold text-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> {formatDateTime(ticket.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Inbox size={13} /> {ticket.replies.length} Replies
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-app border border-border group-hover:border-accent/30 group-hover:bg-accent/10 transition-all self-end sm:self-center">
                <ArrowRight
                  size={18}
                  className="text-muted group-hover:text-accent transition-colors"
                />
              </div>
            </Link>
          ))
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t("support.create_ticket")}
        description={t("support.no_tickets_desc")}
      >
        <form onSubmit={handleCreateTicket} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("support.form.subject")}
            </label>
            <input
              required
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("support.form.subject_placeholder")}
              className="w-full rounded-xl border border-border bg-app px-4 py-3 text-sm text-primary outline-none transition focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                {t("support.category.select")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-app px-4 py-3 text-sm text-primary outline-none focus:border-accent"
              >
                <option value="Technical Issue">{t("support.category.technical")}</option>
                <option value="Feature Request">{t("support.category.feature")}</option>
                <option value="Account & Access">{t("support.category.account")}</option>
                <option value="Bug Report">{t("support.category.bug")}</option>
                <option value="Other">{t("support.category.other")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                {t("support.priority.select")}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full rounded-xl border border-border bg-app px-4 py-3 text-sm text-primary outline-none focus:border-accent"
              >
                <option value="LOW">{t("support.priority.low")}</option>
                <option value="MEDIUM">{t("support.priority.medium")}</option>
                <option value="HIGH">{t("support.priority.high")}</option>
                <option value="URGENT">{t("support.priority.urgent")}</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              {t("support.form.description")}
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("support.form.description_placeholder")}
              className="w-full resize-none rounded-xl border border-border bg-app px-4 py-3 text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-muted hover:text-primary transition"
            >
              {t("support.form.cancel")}
            </button>
            <button
              disabled={busy || !subject || !message}
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition shadow-sm disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{" "}
              {t("support.form.submit")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
