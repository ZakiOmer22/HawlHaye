"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskEvent, Comment, TaskStatus, User } from "@/lib/types";
import { formatDate, formatDateTime, isOverdue } from "@/lib/format";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import { useBoardRealtime } from "@/lib/realtime";
import { Modal } from "@/components/ui/Modal";
import { AttachmentViewer, type ViewerAttachment } from "@/components/layout/AttachmentViewer";
import {
  ArrowLeft,
  AlertTriangle,
  Paperclip,
  UploadCloud,
  CalendarPlus,
  Download,
  UserPlus,
  Loader2,
  Trash2,
  Info,
  Search,
  ChevronDown,
  Check,
  User as UserIcon,
} from "lucide-react";

const STATUS_KEY: Record<TaskStatus, TranslationKey> = {
  UNASSIGNED: "status.unassigned",
  ASSIGNED: "status.assigned",
  IN_PROGRESS: "status.inProgress",
  BLOCKED: "status.blocked",
  REVIEW: "status.review",
  COMPLETED: "status.completed",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  UNASSIGNED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  ASSIGNED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IN_PROGRESS: "bg-accent/10 text-accent border-accent/20",
  BLOCKED: "bg-red-500/10 text-red-500 border-red-500/20",
  REVIEW: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const ROLE_LABEL: Record<string, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

type TaskWithActions = Task & { allowedActions?: TaskStatus[] };

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = usePreferences();

  const [task, setTask] = useState<TaskWithActions | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [pendingMove, setPendingMove] = useState<{ to: TaskStatus; label: string } | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  // Action States
  const [isDelegateOpen, setIsDelegateOpen] = useState(false);
  const [delegateUsers, setDelegateUsers] = useState<User[]>([]);
  const [delegateId, setDelegateId] = useState("");
  const [delegateReason, setDelegateReason] = useState("");
  const [delegateBusy, setDelegateBusy] = useState(false);

  // Searchable Combobox State for Delegate
  const [delegateSearch, setDelegateSearch] = useState("");
  const [isDelegateDropdownOpen, setIsDelegateDropdownOpen] = useState(false);
  const delegateDropdownRef = useRef<HTMLDivElement>(null);

  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  // UI State for Sidebar Tabs
  const [sidebarTab, setSidebarTab] = useState<"details" | "activity" | "comments">("details");

  // Attachment viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const pendingMoveRef = useRef(pendingMove);
  useEffect(() => {
    pendingMoveRef.current = pendingMove;
  }, [pendingMove]);

  const reload = useCallback(async () => {
    try {
      const bust = `?_t=${Date.now()}`;
      const [t, me, e, c, a] = await Promise.all([
        api<{ data: TaskWithActions }>(`/tasks/${id}${bust}`),
        api<{ data: User }>("/auth/me"),
        api<{ data: TaskEvent[] }>(`/tasks/${id}/events${bust}`),
        api<{ data: Comment[] }>(`/tasks/${id}/comments${bust}`),
        api<{ data: Attachment[] }>(`/tasks/${id}/attachments${bust}`),
      ]);
      setTask(t.data);
      setCurrentUser(me.data);
      setEvents(e.data);
      setComments(c.data);
      setAttachments(a.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load task");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useBoardRealtime(() => {
    void reload();
  });

  // FIX: Silent Polling for real-time updates (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void reload();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [reload]);

  // Close delegate dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (delegateDropdownRef.current && !delegateDropdownRef.current.contains(e.target as Node)) {
        setIsDelegateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate Actions
  const getActions = () => {
    if (!task || !currentUser) return [];
    const role = currentUser.role;
    const isLeadership = ["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(role);
    const isOwner = task.ownerId === currentUser.id;

    const actions: {
      to: TaskStatus;
      labelKey: TranslationKey;
      needsReason: boolean;
      isDanger: boolean;
    }[] = [];

    if (task.status === "ASSIGNED" && (isOwner || isLeadership)) {
      actions.push({
        to: "IN_PROGRESS",
        labelKey: "task.action.start",
        needsReason: false,
        isDanger: false,
      });
    }
    if (task.status === "IN_PROGRESS" && (isOwner || isLeadership)) {
      actions.push({
        to: "REVIEW",
        labelKey: "task.action.submit",
        needsReason: false,
        isDanger: false,
      });
      actions.push({
        to: "BLOCKED",
        labelKey: "task.action.block",
        needsReason: true,
        isDanger: true,
      });
    }
    if (task.status === "BLOCKED" && (isOwner || isLeadership)) {
      actions.push({
        to: "IN_PROGRESS",
        labelKey: "task.action.unblock",
        needsReason: false,
        isDanger: false,
      });
    }
    if (task.status === "REVIEW") {
      if (["DEAN", "DEPUTY"].includes(role)) {
        actions.push({
          to: "COMPLETED",
          labelKey: "task.action.approve",
          needsReason: false,
          isDanger: false,
        });
        actions.push({
          to: "IN_PROGRESS",
          labelKey: "task.action.return",
          needsReason: true,
          isDanger: true,
        });
      }
    }
    return actions;
  };

  const executeTransition = useCallback(
    async (to: TaskStatus, reason?: string) => {
      setBusy(true);
      setError(null);
      try {
        await api(`/tasks/${id}/transition`, {
          method: "POST",
          body: JSON.stringify({ to, reason }),
        });
        setPendingMove(null);
        setReasonInput("");
        await reload();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Transition failed");
      } finally {
        setBusy(false);
      }
    },
    [id, reload],
  );

  const handleActionClick = useCallback(
    (to: TaskStatus, labelKey: TranslationKey, needsReason?: boolean) => {
      if (needsReason) setPendingMove({ to, label: t(labelKey) });
      else void executeTransition(to);
    },
    [executeTransition, t],
  );

  const closeReasonModal = useCallback(() => {
    setPendingMove(null);
    setReasonInput("");
  }, []);
  const confirmMove = useCallback(() => {
    if (!pendingMoveRef.current) return;
    void executeTransition(pendingMoveRef.current.to, reasonInput);
  }, [executeTransition, reasonInput]);

  // Delegate Logic
  async function openDelegateModal() {
    setIsDelegateOpen(true);
    setDelegateId("");
    setDelegateSearch("");
    try {
      const res = await api<{ data: User[] }>("/users");
      setDelegateUsers(res.data);
    } catch {
      setError("Failed to load users");
    }
  }

  async function submitDelegate(e: React.FormEvent) {
    e.preventDefault();
    if (!delegateId || !delegateReason.trim()) return;
    setDelegateBusy(true);
    try {
      await api(`/tasks/${id}/delegate`, {
        method: "POST",
        body: JSON.stringify({ delegateId, reason: delegateReason }),
      });
      setIsDelegateOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delegation failed");
    } finally {
      setDelegateBusy(false);
    }
  }

  // Filter delegate users
  const selectedDelegate = delegateUsers.find((u) => u.id === delegateId);
  const filteredDelegateUsers = delegateUsers.filter((u) => {
    if (u.id === currentUser?.id) return false; // Cannot delegate to yourself
    const q = delegateSearch.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || ROLE_LABEL[u.role]?.toLowerCase().includes(q);
  });

  // Delete Task Logic
  async function deleteTask() {
    setIsDeletingTask(true);
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      router.push("/board");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete task");
      setIsDeletingTask(false);
      setIsDeleteTaskOpen(false);
    }
  }

  // Delete Attachment Logic
  async function deleteAttachment(attachmentId: string) {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await api(`/tasks/${id}/attachments/${attachmentId}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete attachment");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await api(`/tasks/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment }),
      });
      setComment("");
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file: File) {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // FIX: Use relative URL so it goes through the Next.js Proxy in production
      const csrf = readCsrfCookie();
      const res = await fetch(`/api/v1/tasks/${id}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: csrf ? { "X-CSRF-Token": csrf } : {},
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (error && !task) return <div className="p-8 text-center text-red-400 font-bold">{error}</div>;
  if (!task || !currentUser)
    return <div className="p-8 text-center text-muted">{t("common.loading")}</div>;

  const overdue = isOverdue(task.dueDate, task.status);
  const actions = getActions();

  const isLeadership = ["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(currentUser.role);

  const canDelegate =
    (task.ownerId === currentUser.id || isLeadership) && task.status !== "COMPLETED";

  const canDeleteTask = isLeadership;
  const canDeleteAttachment = isLeadership || task.ownerId === currentUser.id;

  let gcalLink = "";
  if (task.dueDate) {
    const startDate = new Date(task.dueDate);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const formatGCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${formatGCal(startDate)}/${formatGCal(endDate)}&details=${encodeURIComponent(task.description || "")}&location=${encodeURIComponent(task.office?.name || "")}`;
  }

  const viewerAttachments: ViewerAttachment[] = attachments.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/board"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-accent transition-colors rounded px-2 py-1"
        >
          <ArrowLeft size={16} /> {t("task.back")}
        </Link>

        <div className="flex items-center gap-3">
          {canDelegate && (
            <button
              onClick={openDelegateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-panel border border-border px-4 py-2 text-sm font-bold text-primary hover:border-accent transition shadow-sm"
            >
              <UserPlus size={16} className="text-accent" /> Delegate
            </button>
          )}
          {canDeleteTask && (
            <button
              onClick={() => setIsDeleteTaskOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/20 transition shadow-sm"
            >
              <Trash2 size={16} /> Delete Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-bold tracking-wider text-muted">{task.code}</span>
              <span
                className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[task.status]}`}
              >
                {t(STATUS_KEY[task.status])}
              </span>
              {overdue && (
                <span className="flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                  <AlertTriangle size={12} /> Overdue
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-primary leading-tight">
              {task.title}
            </h1>

            {task.description && (
              <div className="mt-6 text-sm leading-relaxed text-secondary whitespace-pre-wrap bg-app/50 p-4 rounded-xl border border-border/50">
                {task.description}
              </div>
            )}

            {task.blockedReason && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">{t("task.blockedTitle")}</span>
                  {task.blockedReason}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-8 border-t border-border pt-6">
              {actions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider mr-2">
                    Actions:
                  </span>
                  {actions.map((s) => (
                    <button
                      key={s.to}
                      onClick={() => handleActionClick(s.to, s.labelKey, s.needsReason)}
                      disabled={busy}
                      className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${s.isDanger ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20" : "bg-accent text-accent-text hover:bg-accent-hover shadow-sm"}`}
                    >
                      {t(s.labelKey)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted flex items-center gap-2">
                  <Info size={16} /> {t("task.noActions", { status: t(STATUS_KEY[task.status]) })}
                </p>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary mb-6">
              <Paperclip size={16} className="text-accent" /> {t("task.attachments.title")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {attachments.length === 0 ? (
                <div className="col-span-full py-4 text-center border border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted">{t("task.attachments.empty")}</p>
                </div>
              ) : (
                attachments.map((file, i) => (
                  <div
                    key={file.id}
                    className="flex flex-col p-3 rounded-xl border border-border bg-app hover:border-accent/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon mimeType={file.mimeType} />
                        <span className="text-[10px] text-muted font-medium">
                          {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* FIX: Use relative URL for download */}
                        <a
                          href={`/api/v1/tasks/${id}/attachments/${file.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download"
                          className="p-1.5 text-muted hover:bg-accent/10 hover:text-accent rounded"
                        >
                          <Download size={14} />
                        </a>
                        {canDeleteAttachment && (
                          <button
                            onClick={() => deleteAttachment(file.id)}
                            disabled={deletingAttachmentId === file.id}
                            title="Delete"
                            className="p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500 rounded disabled:opacity-50"
                          >
                            {deletingAttachmentId === file.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setViewerIndex(i);
                        setViewerOpen(true);
                      }}
                      className="text-start w-full"
                    >
                      <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                        {file.fileName}
                      </p>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${isDragOver ? "border-accent bg-accent/5" : "border-border bg-app hover:bg-panel-hover"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void uploadFile(f);
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                }}
                className="hidden"
              />
              <UploadCloud
                size={24}
                className={isDragOver ? "text-accent mb-2" : "text-muted mb-2"}
              />
              <p className="text-sm font-medium text-primary text-center mb-3">
                {uploading ? t("task.attachments.uploading") : t("task.attachments.dragDrop")}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-panel border border-border px-4 py-2 text-xs font-bold text-primary hover:border-accent transition disabled:opacity-50"
              >
                {t("task.attachments.upload")}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Column with Tabs */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-panel shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="flex border-b border-border">
              <button
                onClick={() => setSidebarTab("details")}
                className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${sidebarTab === "details" ? "border-accent text-accent bg-accent/5" : "border-transparent text-muted hover:text-primary hover:bg-app"}`}
              >
                Details
              </button>
              <button
                onClick={() => setSidebarTab("activity")}
                className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${sidebarTab === "activity" ? "border-accent text-accent bg-accent/5" : "border-transparent text-muted hover:text-primary hover:bg-app"}`}
              >
                Activity
              </button>
              <button
                onClick={() => setSidebarTab("comments")}
                className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${sidebarTab === "comments" ? "border-accent text-accent bg-accent/5" : "border-transparent text-muted hover:text-primary hover:bg-app"}`}
              >
                Comments
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
              {sidebarTab === "details" && (
                <div className="space-y-5 text-sm animate-in fade-in">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      {t("task.details.owner")}
                    </p>
                    <p className="font-bold text-primary">
                      {task.owner?.fullName ?? t("task.details.unassigned")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      {t("task.details.category")}
                    </p>
                    <p className="font-bold text-primary">{task.category?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      {t("task.details.office")}
                    </p>
                    <p className="font-bold text-primary">{task.office?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      {t("task.details.dueDate")}
                    </p>
                    <div className="flex items-center justify-between bg-app p-2 rounded-lg border border-border mt-1">
                      <p className={`font-bold ${overdue ? "text-red-500" : "text-primary"}`}>
                        {task.dueDate ? formatDate(task.dueDate) : "—"}
                      </p>
                      {gcalLink && (
                        <a
                          href={gcalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Add to Calendar"
                          className="p-1.5 bg-panel rounded-md border border-border text-muted hover:text-accent transition"
                        >
                          <CalendarPlus size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {sidebarTab === "activity" && (
                <div className="animate-in fade-in">
                  {events.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4">{t("task.history.empty")}</p>
                  ) : (
                    <ol className="space-y-6 relative border-s border-border ms-2">
                      {events.map((ev) => (
                        <li key={ev.id} className="relative ps-6">
                          <span className="absolute -start-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-panel" />
                          <p className="text-sm font-bold text-primary capitalize">
                            {ev.type.replace(/_/g, " ").toLowerCase()}
                          </p>
                          <p className="text-[10px] text-muted mt-0.5">
                            {ev.actor?.fullName ?? "System"} · {formatDateTime(ev.createdAt)}
                          </p>
                          {ev.note && (
                            <p className="mt-2 text-xs italic text-secondary bg-app p-2 rounded-lg border border-border">
                              "{ev.note}"
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {sidebarTab === "comments" && (
                <div className="flex flex-col h-full animate-in fade-in">
                  <div className="flex-1 space-y-3 mb-4">
                    {comments.length === 0 && (
                      <p className="text-xs text-muted text-center py-4">
                        {t("task.comments.empty")}
                      </p>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-xl bg-app border border-border p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-5 w-5 rounded-full bg-panel-hover flex items-center justify-center text-[9px] font-bold text-primary border border-border">
                            {c.author.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-primary">
                            {c.author.fullName}
                          </span>
                          <span className="text-[9px] text-muted ms-auto">
                            {formatDateTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-xs text-secondary leading-relaxed ps-7">
                          {c.body}
                        </p>
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={addComment}
                    className="mt-auto pt-4 border-t border-border shrink-0"
                  >
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      placeholder={t("task.comments.placeholder")}
                      className="w-full rounded-xl border border-border bg-app p-3 text-xs text-primary placeholder-muted outline-none focus:border-accent resize-none"
                    />
                    <button
                      type="submit"
                      disabled={busy || !comment.trim()}
                      className="mt-2 w-full rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-text hover:bg-accent-hover disabled:opacity-50"
                    >
                      {t("task.comments.post")}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={!!pendingMove}
        onClose={closeReasonModal}
        title={pendingMove?.label || "Action Required"}
        description={
          pendingMove?.to === "BLOCKED"
            ? t("task.modal.reasonRequired")
            : t("task.modal.commentRequired")
        }
      >
        <div className="space-y-4">
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-app p-3 text-primary outline-none focus:border-accent"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={closeReasonModal}
              className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={confirmMove}
              disabled={busy || reasonInput.trim().length < 3}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-accent-text disabled:opacity-50"
            >
              {busy ? t("board.modal.saving") : t("common.confirm")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDelegateOpen}
        onClose={() => setIsDelegateOpen(false)}
        title="Delegate Task"
        description="Search for a user by name or role to delegate this task to."
      >
        <form onSubmit={submitDelegate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Delegate To
            </label>
            <div className="relative" ref={delegateDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDelegateDropdownOpen(!isDelegateDropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-app py-2.5 px-4 text-sm text-primary outline-none transition focus:border-accent"
              >
                {selectedDelegate ? (
                  <span className="flex items-center gap-2">
                    <UserIcon size={14} className="text-accent" />
                    <span className="font-bold">{selectedDelegate.fullName}</span>
                    <span className="text-xs text-muted">
                      ({ROLE_LABEL[selectedDelegate.role] || selectedDelegate.role})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted">Select a user...</span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-muted transition-transform ${isDelegateDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isDelegateDropdownOpen && (
                <div className="absolute z-[100] mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-border bg-panel shadow-2xl animate-in fade-in slide-in-from-top-1">
                  <div className="border-b border-border p-2">
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search by name or role..."
                        value={delegateSearch}
                        onChange={(e) => setDelegateSearch(e.target.value)}
                        className="w-full rounded-lg border border-border bg-app py-2 ps-9 pe-3 text-sm text-primary outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48 p-1">
                    {filteredDelegateUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted">
                        No users found matching "{delegateSearch}"
                      </div>
                    ) : (
                      filteredDelegateUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setDelegateId(u.id);
                            setIsDelegateDropdownOpen(false);
                            setDelegateSearch("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition hover:bg-app"
                        >
                          <div>
                            <p className="font-bold text-primary">{u.fullName}</p>
                            <p className="text-xs text-muted">{ROLE_LABEL[u.role] || u.role}</p>
                          </div>
                          {delegateId === u.id && <Check size={16} className="text-accent" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Reason for Delegation
            </label>
            <textarea
              required
              rows={3}
              value={delegateReason}
              onChange={(e) => setDelegateReason(e.target.value)}
              placeholder="Why are you delegating this task?"
              className="w-full rounded-xl border border-border bg-app p-3 text-sm text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsDelegateOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={delegateBusy || !delegateId || !delegateReason}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-accent-text disabled:opacity-50"
            >
              {delegateBusy ? <Loader2 size={16} className="animate-spin" /> : "Delegate"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteTaskOpen}
        onClose={() => setIsDeleteTaskOpen(false)}
        title="Delete Task"
        description="Are you sure you want to permanently delete this task?"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
            This action cannot be undone. All comments, attachments, and history will be lost.
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsDeleteTaskOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
            >
              Cancel
            </button>
            <button
              onClick={deleteTask}
              disabled={isDeletingTask}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isDeletingTask ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}{" "}
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <AttachmentViewer
        taskId={id}
        attachments={viewerAttachments}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf"))
    return (
      <span className="text-red-500 font-bold text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded">
        PDF
      </span>
    );
  if (mimeType.includes("image"))
    return (
      <span className="text-blue-500 font-bold text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded">
        IMG
      </span>
    );
  if (mimeType.includes("word"))
    return (
      <span className="text-blue-600 font-bold text-[10px] bg-blue-600/10 px-1.5 py-0.5 rounded">
        DOC
      </span>
    );
  if (mimeType.includes("excel"))
    return (
      <span className="text-green-500 font-bold text-[10px] bg-green-500/10 px-1.5 py-0.5 rounded">
        XLS
      </span>
    );
  return (
    <span className="text-slate-400 font-bold text-[10px] bg-slate-400/10 px-1.5 py-0.5 rounded">
      FILE
    </span>
  );
}
