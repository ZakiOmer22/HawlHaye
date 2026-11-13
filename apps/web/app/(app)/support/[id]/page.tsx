"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import {
  Send,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User as UserIcon,
  ShieldAlert,
  Image as ImageIcon,
  X,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type UserRole =
  | "ADMINISTRATOR"
  | "DEAN"
  | "DEPUTY"
  | "FACULTY_COORDINATOR"
  | "LABS_COORDINATOR"
  | "LAB_TECHNICIAN";

type TicketReply = {
  id: string;
  message: string;
  imageUrl?: string | null;
  createdAt: string;
  author: { id: string; fullName: string; role: string };
};

type Ticket = {
  id: string;
  subject: string;
  description: string;
  imageUrl?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  createdBy: { id: string; fullName: string; role: string };
  replies: TicketReply[];
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

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = usePreferences();

  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      try {
        const [ticketRes, meRes] = await Promise.all([
          api<{ data: Ticket }>(`/tickets/${id}?_t=${Date.now()}`),
          api<{ data: { role: UserRole } }>("/auth/me"),
        ]);
        setTicket(ticketRes.data);
        setCurrentUserRole(meRes.data.role);
      } catch (err) {
        if (!silent) setError(err instanceof ApiError ? err.message : "Failed to load ticket.");
      } finally {
        if (!silent) setLoading(false);
        else setIsRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Real-time polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void loadData(true);
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadData(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.replies.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplyImage(file);
    setReplyImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setReplyImage(null);
    setReplyImagePreview(null);
    if (replyFileInputRef.current) replyFileInputRef.current.value = "";
  };

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket || (!replyMessage.trim() && !replyImage)) return;
    setReplyBusy(true);

    try {
      const formData = new FormData();
      formData.append("message", replyMessage.trim() || t("support.image_attached"));
      if (replyImage) formData.append("image", replyImage);

      await api(`/tickets/${id}/reply`, { method: "POST", body: formData });

      setReplyMessage("");
      clearImage();
      await loadData(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send reply.");
    } finally {
      setReplyBusy(false);
    }
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (!ticket) return;
    setStatusBusy(true);
    try {
      await api(`/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setTicket({ ...ticket, status: newStatus });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setStatusBusy(false);
    }
  }

  const statusColor = (status: TicketStatus) => {
    if (status === "OPEN") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (status === "IN_PROGRESS") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (status === "RESOLVED") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  };

  if (loading && !ticket) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">{error || "Ticket not found"}</div>
    );
  }

  const canChangeStatus = currentUserRole === "ADMINISTRATOR" || currentUserRole === "DEAN";

  return (
    <div className="max-w-[1200px] mx-auto py-4 md:py-6 px-4 lg:h-[calc(100dvh-100px)] flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button
          onClick={() => router.push("/support")}
          className="p-2 rounded-xl bg-panel border border-border text-muted hover:text-primary transition shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-black text-primary tracking-tight flex items-center gap-2">
            {ticket.subject}
            {isRefreshing && <RefreshCw size={14} className="animate-spin text-muted" />}
          </h1>
          <p className="text-xs font-bold text-muted mt-1 flex items-center gap-2">
            <span>#{ticket.id.slice(-6).toUpperCase()}</span>
            <span>•</span>
            <span>{formatDateTime(ticket.createdAt)}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-500 flex items-center gap-2 shrink-0">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:min-h-0">
        {/* Sidebar */}
        <div className="w-full lg:w-[300px] shrink-0 space-y-4 order-1 lg:order-2">
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4 border-b border-border pb-2 flex items-center justify-between">
              <span>{t("support.ticket_details")}</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-5">
              <div className="col-span-2 lg:col-span-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  {t("support.status")}
                </label>
                {canChangeStatus ? (
                  <div className="relative">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                      disabled={statusBusy}
                      className={`w-full appearance-none text-xs font-bold px-3 py-2.5 rounded-xl border uppercase tracking-wider outline-none cursor-pointer transition-colors ${statusColor(ticket.status)}`}
                    >
                      <option value="OPEN">{t(STATUS_MAP.OPEN)}</option>
                      <option value="IN_PROGRESS">{t(STATUS_MAP.IN_PROGRESS)}</option>
                      <option value="RESOLVED">{t(STATUS_MAP.RESOLVED)}</option>
                      <option value="CLOSED">{t(STATUS_MAP.CLOSED)}</option>
                    </select>
                    {statusBusy ? (
                      <Loader2
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-current pointer-events-none"
                      />
                    ) : (
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-current pointer-events-none"
                      />
                    )}
                  </div>
                ) : (
                  <span
                    className={`inline-block text-xs font-bold px-3 py-2 rounded-xl border uppercase tracking-wider ${statusColor(ticket.status)}`}
                  >
                    {t(STATUS_MAP[ticket.status])}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  {t("support.priority")}
                </label>
                <p className="text-sm font-bold text-primary capitalize">
                  {ticket.priority.toLowerCase()}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  {t("support.category.select")}
                </label>
                <p className="text-sm font-bold text-primary">
                  {t(CATEGORY_MAP[ticket.category] || "support.category.other")}
                </p>
              </div>

              <div className="col-span-2 lg:col-span-1 border-t border-border pt-4 lg:border-none lg:pt-0">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  {t("support.created_by")}
                </label>
                <p className="text-sm font-bold text-primary">{ticket.createdBy.fullName}</p>
              </div>

              <div className="col-span-2 lg:col-span-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1.5">
                  {t("support.last_updated")}
                </label>
                <p className="text-sm font-bold text-primary">
                  {formatDateTime(
                    ticket.replies[ticket.replies.length - 1]?.createdAt || ticket.createdAt,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col rounded-2xl border border-border bg-panel lg:overflow-hidden shadow-sm order-2 lg:order-1 min-h-[60vh] lg:min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-app/10 custom-scrollbar">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <UserIcon size={18} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold text-primary">
                    {ticket.createdBy.fullName}
                  </span>
                  <span className="text-[10px] text-muted">{formatDateTime(ticket.createdAt)}</span>
                </div>
                <div className="rounded-2xl rounded-tl-none border border-border bg-panel p-4 text-sm text-secondary leading-relaxed shadow-sm inline-block max-w-[95%] break-words">
                  {ticket.description}
                  {ticket.imageUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-border">
                      <img
                        src={ticket.imageUrl}
                        alt="Attachment"
                        className="max-w-full h-auto max-h-[300px] object-contain bg-black/50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {ticket.replies.map((reply) => {
              const isSysAdmin = reply.author.role === "ADMINISTRATOR";
              const isRightAligned = reply.author.id === ticket.createdBy.id;

              return (
                <div
                  key={reply.id}
                  className={`flex gap-4 ${isRightAligned ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${isSysAdmin ? "bg-panel border-border text-primary" : "bg-accent/10 border-accent/20 text-accent"}`}
                  >
                    {isSysAdmin ? <ShieldAlert size={18} /> : <UserIcon size={18} />}
                  </div>
                  <div
                    className={`flex-1 flex flex-col min-w-0 ${isRightAligned ? "items-end" : "items-start"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold text-primary">
                        {reply.author.fullName}
                      </span>
                      {isSysAdmin && (
                        <span className="text-[9px] font-bold bg-accent text-accent-text px-2 py-0.5 rounded-md uppercase shadow-sm">
                          {t("support.staff")}
                        </span>
                      )}
                      <span className="text-[10px] text-muted">
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl border p-4 text-sm leading-relaxed max-w-[95%] shadow-sm break-words ${
                        isRightAligned
                          ? "rounded-tr-none border-accent/20 bg-accent text-accent-text"
                          : "rounded-tl-none border-border bg-panel text-secondary"
                      }`}
                    >
                      {reply.message}
                      {reply.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
                          <img
                            src={reply.imageUrl}
                            alt="Attachment"
                            className="max-w-full h-auto max-h-[300px] object-contain bg-black/50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} className="h-2" />
          </div>

          {/* Reply Input */}
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" ? (
            <div className="p-3 md:p-4 border-t border-border bg-panel shrink-0">
              {replyImagePreview && (
                <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2">
                  <img
                    src={replyImagePreview}
                    alt="Preview"
                    className="h-20 w-auto rounded-lg border border-border object-cover shadow-sm"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <form onSubmit={handleReply} className="flex items-end gap-2 md:gap-3">
                <div className="flex-1 flex items-end gap-2 rounded-2xl border border-border bg-app px-3 py-2 transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20">
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current?.click()}
                    className="p-2 text-muted hover:text-accent hover:bg-panel rounded-xl transition shrink-0"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={t("support.reply_placeholder")}
                    rows={1}
                    className="flex-1 resize-none bg-transparent py-1.5 text-sm text-primary placeholder-muted outline-none custom-scrollbar"
                    style={{ minHeight: "32px", maxHeight: "120px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={replyBusy || (!replyMessage.trim() && !replyImage)}
                  className="shrink-0 flex items-center justify-center rounded-xl bg-accent h-[46px] w-[46px] text-accent-text hover:bg-accent-hover transition disabled:opacity-50 shadow-sm"
                >
                  {replyBusy ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} className="-ml-0.5" />
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 border-t border-border bg-app/50 text-center shrink-0">
              <p className="text-sm font-bold text-muted flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> {t("support.ticket_closed_msg")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
