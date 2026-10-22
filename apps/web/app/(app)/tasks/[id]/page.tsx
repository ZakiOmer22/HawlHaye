"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Task, TaskEvent, Comment, TaskStatus } from "@/lib/types";
import { formatDate, formatDateTime, isOverdue } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { ArrowLeft, MessageSquare, Clock, AlertTriangle, Paperclip, Upload } from "lucide-react";

const NEXT_STEPS: Record<
  TaskStatus,
  { label: string; to: TaskStatus; needsReason?: boolean; isDanger?: boolean }[]
> = {
  UNASSIGNED: [],
  ASSIGNED: [
    { label: "Start Work", to: "IN_PROGRESS" },
    { label: "Block Task", to: "BLOCKED", needsReason: true, isDanger: true },
  ],
  IN_PROGRESS: [
    { label: "Submit for Review", to: "REVIEW" },
    { label: "Block Task", to: "BLOCKED", needsReason: true, isDanger: true },
  ],
  BLOCKED: [{ label: "Unblock & Resume", to: "IN_PROGRESS" }],
  REVIEW: [
    { label: "Approve & Complete", to: "COMPLETED" },
    { label: "Return to In Progress", to: "IN_PROGRESS", needsReason: true, isDanger: true },
  ],
  COMPLETED: [],
};

interface Attachment {
  id: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Modal State
  const [pendingMove, setPendingMove] = useState<{ to: TaskStatus; label: string } | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  const reload = useCallback(async () => {
    try {
      const [t, e, c, a] = await Promise.all([
        api<{ data: Task }>(`/tasks/${id}`),
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

  async function executeTransition(to: TaskStatus, reason?: string) {
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
  }

  function handleActionClick(to: TaskStatus, label: string, needsReason?: boolean) {
    if (needsReason) {
      setPendingMove({ to, label });
    } else {
      executeTransition(to);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${id}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include", // Send cookies for auth
        // Note: Do NOT set Content-Type header. The browser sets it automatically with the boundary.
      });

      if (!res.ok) {
        const data = await res.json();
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
  if (!task) return <div className="p-8 text-center text-[#94A3B8]">Loading task details...</div>;

  const overdue = isOverdue(task.dueDate, task.status);
  const steps = NEXT_STEPS[task.status] ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <Link
        href="/board"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#94A3B8] hover:text-[#e8bc69] transition-colors"
      >
        <ArrowLeft size={16} /> Back to board
      </Link>

      <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold tracking-wider text-[#94A3B8]">{task.code}</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-white leading-tight">
              {task.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="rounded-lg bg-[#0F172A] border border-[#334155] px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider">
              {task.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {task.description && (
          <p className="mt-6 text-sm leading-relaxed text-[#A0ABC0]">{task.description}</p>
        )}

        {task.blockedReason && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1">Task is Blocked</span>
              {task.blockedReason}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4 border-t border-[#334155] pt-6">
          <div>
            <p className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px] mb-1">
              Owner
            </p>
            <p className="font-bold text-white">{task.owner?.fullName ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px] mb-1">
              Category
            </p>
            <p className="font-bold text-white">{task.category?.name ?? "—"}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px] mb-1">
              Office
            </p>
            <p className="font-bold text-white">{task.office?.name ?? "—"}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px] mb-1">
              Due Date
            </p>
            <p className={`font-bold ${overdue ? "text-red-400" : "text-white"}`}>
              {task.dueDate ? formatDate(task.dueDate) : "—"}
            </p>
          </div>
        </div>

        {steps.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3 border-t border-[#334155] pt-6">
            {steps.map((s) => (
              <button
                key={s.to}
                onClick={() => handleActionClick(s.to, s.label, s.needsReason)}
                disabled={busy}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${
                  s.isDanger
                    ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                    : "bg-[#e8bc69] text-[#0F172A] hover:bg-[#f1cf8b] shadow-[0_0_15px_rgba(232,188,105,0.2)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* History Column */}
        <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
          <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-white mb-6">
            <Clock size={16} className="text-[#e8bc69]" /> History
          </h2>
          <ol className="space-y-6 relative border-l border-[#334155] ml-2">
            {events.map((ev) => (
              <li key={ev.id} className="relative pl-6">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#e8bc69] ring-4 ring-[#1E293B]" />
                <p className="text-sm font-bold text-white capitalize">
                  {ev.type.replace(/_/g, " ").toLowerCase()}
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {ev.actor?.fullName ?? "System"} · {formatDateTime(ev.createdAt)}
                </p>
                {ev.note && (
                  <p className="mt-2 text-xs italic text-[#A0ABC0] bg-[#0F172A] p-2 rounded-lg border border-[#334155]">
                    "{ev.note}"
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Comments & Attachments Column */}
        <div className="flex flex-col gap-6">
          {/* Attachments */}
          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-white">
                <Paperclip size={16} className="text-[#e8bc69]" /> Attachments
              </h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg bg-[#e8bc69]/10 border border-[#e8bc69]/20 px-3 py-1.5 text-xs font-bold text-[#e8bc69] hover:bg-[#e8bc69]/20 disabled:opacity-50"
              >
                <Upload size={14} /> {uploading ? "Uploading..." : "Upload File"}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {attachments.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">No attachments yet.</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((file) => (
                  <a
                    key={file.id}
                    href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${id}/attachments/${file.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-[#334155] bg-[#0F172A] hover:border-[#e8bc69]/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon mimeType={file.fileName} />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-[#e8bc69] transition-colors">
                          {file.fileName}
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6 flex flex-col flex-1">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-white mb-4">
              <MessageSquare size={16} className="text-[#e8bc69]" /> Comments
            </h2>
            <div className="flex-1 space-y-3 mb-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {comments.length === 0 && <p className="text-sm text-[#94A3B8]">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-[#0F172A] border border-[#334155] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{c.author.fullName}</span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-[#A0ABC0] leading-relaxed">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={addComment} className="mt-auto">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Write a comment..."
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] p-3 text-sm text-white outline-none focus:border-[#e8bc69] resize-none"
              />
              <button
                type="submit"
                disabled={busy || !comment.trim()}
                className="mt-2 w-full rounded-xl bg-[#e8bc69] px-4 py-2 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50"
              >
                Post Comment
              </button>
            </form>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {error}
        </div>
      )}

      <Modal
        isOpen={!!pendingMove}
        onClose={() => {
          setPendingMove(null);
          setReasonInput("");
        }}
        title={pendingMove?.label || "Action Required"}
        description={
          pendingMove?.to === "BLOCKED"
            ? "Please provide a reason why this task is blocked."
            : "Please provide a comment explaining why this task is being returned."
        }
      >
        <div className="space-y-4">
          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder={
              pendingMove?.to === "BLOCKED"
                ? "e.g. Waiting for vendor approval..."
                : "e.g. Missing required documentation..."
            }
            rows={4}
            className="w-full rounded-xl border border-[#334155] bg-[#0F172A] p-3 text-white outline-none focus:border-[#e8bc69]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setPendingMove(null);
                setReasonInput("");
              }}
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#94A3B8] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => pendingMove && executeTransition(pendingMove.to, reasonInput)}
              disabled={busy || reasonInput.trim().length < 3}
              className="rounded-lg bg-[#e8bc69] px-5 py-2 text-sm font-bold text-[#0F172A] disabled:opacity-50"
            >
              {busy ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf")) return <span className="text-red-400 font-bold text-xs">PDF</span>;
  if (mimeType.includes("image"))
    return <span className="text-blue-400 font-bold text-xs">IMG</span>;
  if (mimeType.includes("word"))
    return <span className="text-blue-600 font-bold text-xs">DOC</span>;
  if (mimeType.includes("excel"))
    return <span className="text-green-500 font-bold text-xs">XLS</span>;
  return <span className="text-slate-400 font-bold text-xs">FILE</span>;
}
