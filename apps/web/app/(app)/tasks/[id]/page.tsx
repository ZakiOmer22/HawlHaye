"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskEvent, Comment, TaskStatus } from "@/lib/types";
import { formatDate, formatDateTime, isOverdue } from "@/lib/format";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import { Modal } from "@/components/ui/Modal";
import { AttachmentViewer, type ViewerAttachment } from "@/components/layout/AttachmentViewer";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  AlertTriangle,
  Paperclip,
  UploadCloud,
  CalendarPlus,
  Download,
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

function actionMeta(from: TaskStatus, to: TaskStatus) {
  if (to === "BLOCKED") {
    return { labelKey: "task.action.block" as TranslationKey, needsReason: true, isDanger: true };
  }
  if (from === "REVIEW" && to === "IN_PROGRESS") {
    return { labelKey: "task.action.return" as TranslationKey, needsReason: true, isDanger: true };
  }
  if (from === "BLOCKED" && to === "IN_PROGRESS") {
    return {
      labelKey: "task.action.unblock" as TranslationKey,
      needsReason: false,
      isDanger: false,
    };
  }

  const labels: Partial<Record<string, TranslationKey>> = {
    "UNASSIGNED->ASSIGNED": "task.action.assign",
    "ASSIGNED->IN_PROGRESS": "task.action.start",
    "IN_PROGRESS->REVIEW": "task.action.submit",
    "REVIEW->COMPLETED": "task.action.approve",
  };

  return {
    labelKey: labels[`${from}->${to}`] ?? ("task.action.start" as TranslationKey),
    needsReason: false,
    isDanger: false,
  };
}

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
  const { t } = usePreferences();

  const [task, setTask] = useState<TaskWithActions | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [pendingMove, setPendingMove] = useState<{
    to: TaskStatus;
    label: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  // Attachment viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const pendingMoveRef = useRef(pendingMove);
  useEffect(() => {
    pendingMoveRef.current = pendingMove;
  }, [pendingMove]);

  const reload = useCallback(async () => {
    try {
      const [t, e, c, a] = await Promise.all([
        api<{ data: TaskWithActions }>(`/tasks/${id}`),
        api<{ data: TaskEvent[] }>(`/tasks/${id}/events`),
        api<{ data: Comment[] }>(`/tasks/${id}/comments`),
        api<{ data: Attachment[] }>(`/tasks/${id}/attachments`),
      ]);
      setTask(t.data);
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
      if (needsReason) {
        setPendingMove({ to, label: t(labelKey) });
      } else {
        void executeTransition(to);
      }
    },
    [executeTransition, t],
  );

  const closeReasonModal = useCallback(() => {
    setPendingMove(null);
    setReasonInput("");
  }, []);

  const confirmMove = useCallback(() => {
    const pm = pendingMoveRef.current;
    if (!pm) return;
    void executeTransition(pm.to, reasonInput);
  }, [executeTransition, reasonInput]);

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
      const csrf = readCsrfCookie();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${id}/attachments`, {
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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  if (error && !task) return <div className="p-8 text-center text-red-400 font-bold">{error}</div>;
  if (!task) return <div className="p-8 text-center text-muted">{t("common.loading")}</div>;

  const overdue = isOverdue(task.dueDate, task.status);
  const steps = (task.allowedActions ?? []).map((to) => {
    const meta = actionMeta(task.status, to);
    return { to, ...meta };
  });

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
      <div className="flex items-center justify-between">
        <Link
          href="/board"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-2 py-1"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {t("task.back")}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-panel p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold tracking-wider text-muted">{task.code}</span>
                  <span
                    className={`rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[task.status]}`}
                  >
                    {t(STATUS_KEY[task.status])}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-primary leading-tight">
                  {task.title}
                </h1>
              </div>
            </div>

            {task.description && (
              <div className="mt-6 text-sm leading-relaxed text-secondary whitespace-pre-wrap">
                {task.description}
              </div>
            )}

            {task.blockedReason && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500"
              >
                <AlertTriangle size={18} aria-hidden="true" className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">{t("task.blockedTitle")}</span>
                  {task.blockedReason}
                </div>
              </div>
            )}

            {steps.length > 0 ? (
              <div
                role="group"
                aria-label="Available actions"
                className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6"
              >
                {steps.map((s) => (
                  <button
                    key={s.to}
                    type="button"
                    onClick={() => handleActionClick(s.to, s.labelKey, s.needsReason)}
                    disabled={busy}
                    className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel ${
                      s.isDanger
                        ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
                        : "bg-accent text-accent-text hover:bg-accent-hover shadow-sm"
                    }`}
                  >
                    {t(s.labelKey)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-sm text-muted">
                  {t("task.noActions", { status: t(STATUS_KEY[task.status]) })}
                </p>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
                <Paperclip size={16} aria-hidden="true" className="text-accent" />{" "}
                {t("task.attachments.title")}
              </h2>
            </div>

            <div className="space-y-3">
              {attachments.length === 0 ? (
                <p className="text-sm text-muted">{t("task.attachments.empty")}</p>
              ) : (
                attachments.map((file, i) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-app hover:border-accent/40 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => openViewer(i)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                    >
                      <div className="h-10 w-10 rounded-lg bg-panel flex items-center justify-center border border-border shrink-0">
                        <FileIcon mimeType={file.mimeType} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                          {file.fileName}
                        </p>
                        <p className="text-[10px] text-muted font-medium">
                          {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </button>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${id}/attachments/${file.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download"
                      aria-label={`Download ${file.fileName}`}
                      className="shrink-0 rounded-lg p-2 text-muted hover:bg-accent/10 hover:text-accent transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))
              )}
            </div>

            <div
              className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
                isDragOver
                  ? "border-accent bg-accent/5"
                  : "border-border bg-app hover:bg-panel-hover"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                aria-label={t("task.attachments.upload")}
              />
              <UploadCloud
                size={24}
                className={isDragOver ? "text-accent mb-2" : "text-muted mb-2"}
              />
              <p className="text-sm font-medium text-primary text-center">
                {uploading ? t("task.attachments.uploading") : t("task.attachments.dragDrop")}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-3 rounded-lg bg-panel border border-border px-4 py-2 text-xs font-bold text-primary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
              >
                {t("task.attachments.upload")}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted mb-4">
              Details
            </h3>
            <div className="space-y-4 text-sm">
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
                <div className="flex items-center justify-between">
                  <p className={`font-bold ${overdue ? "text-red-500" : "text-primary"}`}>
                    {task.dueDate ? formatDate(task.dueDate) : "—"}
                  </p>
                  {gcalLink && (
                    <a
                      href={gcalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("task.gcal")}
                      className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20 transition-colors"
                    >
                      <CalendarPlus size={12} /> {t("task.gcal")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary mb-6">
              <Clock size={16} aria-hidden="true" className="text-accent" />{" "}
              {t("task.history.title")}
            </h2>
            {events.length === 0 ? (
              <p className="text-xs text-muted">{t("task.history.empty")}</p>
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

          <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm flex flex-col">
            <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-primary mb-4">
              <MessageSquare size={16} aria-hidden="true" className="text-accent" />{" "}
              {t("task.comments.title")}
            </h2>
            <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pe-2">
              {comments.length === 0 && (
                <p className="text-xs text-muted">{t("task.comments.empty")}</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-app border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-full bg-panel-hover flex items-center justify-center text-[9px] font-bold text-primary border border-border">
                      {c.author.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-primary">{c.author.fullName}</span>
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
            <form onSubmit={addComment} className="mt-auto pt-4 border-t border-border">
              <textarea
                id="new-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder={t("task.comments.placeholder")}
                className="w-full rounded-xl border border-border bg-app p-3 text-xs text-primary placeholder-muted outline-none focus:border-accent resize-none"
              />
              <button
                type="submit"
                disabled={busy || !comment.trim()}
                className="mt-2 w-full rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-text hover:bg-accent-hover disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("task.comments.post")}
              </button>
            </form>
          </div>
        </div>
      </div>

      {error && task && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500 mt-6"
        >
          {error}
        </div>
      )}

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
            id="transition-reason"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder={
              pendingMove?.to === "BLOCKED"
                ? "e.g. Waiting for vendor approval..."
                : "e.g. Missing required documentation..."
            }
            rows={4}
            className="w-full rounded-xl border border-border bg-app p-3 text-primary outline-none focus:border-accent"
          />
          <p className="text-xs text-muted">
            {reasonInput.trim().length < 3
              ? t("task.modal.charactersLeft", { count: 3 - reasonInput.trim().length })
              : t("task.modal.ready")}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeReasonModal}
              className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={confirmMove}
              disabled={busy || reasonInput.trim().length < 3}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-accent-text disabled:opacity-50"
            >
              {busy ? t("board.modal.saving") : t("common.confirm")}
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
    return <span className="text-red-500 font-bold text-[10px]">PDF</span>;
  if (mimeType.includes("image"))
    return <span className="text-blue-500 font-bold text-[10px]">IMG</span>;
  if (mimeType.includes("word"))
    return <span className="text-blue-600 font-bold text-[10px]">DOC</span>;
  if (mimeType.includes("excel"))
    return <span className="text-green-500 font-bold text-[10px]">XLS</span>;
  return <span className="text-slate-400 font-bold text-[10px]">FILE</span>;
}
