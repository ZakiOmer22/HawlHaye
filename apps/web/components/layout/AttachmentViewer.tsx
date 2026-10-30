"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";

export type ViewerAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

type SignedResponse = {
  url: string;
  mimeType: string;
  fileName: string;
  expiresIn: number;
};

export function AttachmentViewer({
  taskId,
  attachments,
  initialIndex,
  open,
  onClose,
}: {
  taskId: string;
  attachments: ViewerAttachment[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [signed, setSigned] = useState<SignedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = attachments[index];

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setSigned(null);
      setError(null);
    }
  }, [open, initialIndex]);

  const loadSigned = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    setSigned(null);
    try {
      const r = await api<{ data: SignedResponse }>(
        `/tasks/${taskId}/attachments/${current.id}/signed-url`,
        { method: "POST" },
      );
      const base = process.env.NEXT_PUBLIC_API_URL ?? "";
      setSigned({
        ...r.data,
        url: r.data.url.startsWith("http") ? r.data.url : `${base}${r.data.url}`,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load attachment");
    } finally {
      setLoading(false);
    }
  }, [taskId, current]);

  useEffect(() => {
    if (open && current) void loadSigned();
  }, [open, current, loadSigned]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(attachments.length - 1, i + 1));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, attachments.length, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !current) return null;

  const canPrev = index > 0;
  const canNext = index < attachments.length - 1;
  const isImage = current.mimeType.startsWith("image/");
  const isPdf = current.mimeType === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Attachment viewer"
    >
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">{current.fileName}</p>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            {index + 1} of {attachments.length} · {current.mimeType}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {signed && (
            <>
              <a
                href={signed.url}
                download={current.fileName}
                className="rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 text-white transition"
                title="Download"
                aria-label="Download"
              >
                <Download size={16} />
              </a>
              <a
                href={signed.url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 text-white transition"
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <ExternalLink size={16} />
              </a>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 text-white transition"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {canPrev && (
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 text-white transition"
          title="Previous (←)"
          aria-label="Previous"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 text-white transition"
          title="Next (→)"
          aria-label="Next"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <div className="absolute inset-0 flex items-center justify-center p-16 sm:p-24">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#e8bc69]" />
            <p className="text-sm text-white">Loading…</p>
          </div>
        ) : error ? (
          <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-3" />
            <p className="text-sm font-bold text-red-400">{error}</p>
            <button
              onClick={() => void loadSigned()}
              className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          </div>
        ) : !signed ? null : isImage ? (
          <img
            src={signed.url}
            alt={current.fileName}
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
          />
        ) : isPdf ? (
          <iframe
            src={signed.url}
            title={current.fileName}
            className="h-full w-full max-w-5xl bg-white rounded-lg shadow-2xl"
          />
        ) : (
          <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-[#e8bc69] mb-4" />
            <p className="text-base font-bold text-white mb-1 break-all">{current.fileName}</p>
            <p className="text-xs text-[#94A3B8] mb-5">
              This file type can&apos;t be previewed. Download it to open in the appropriate app.
            </p>
            <a
              href={signed.url}
              download={current.fileName}
              className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition"
            >
              <Download size={16} /> Download
            </a>
          </div>
        )}
      </div>

      {attachments.length > 1 && (
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent overflow-x-auto">
          {attachments.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition max-w-[180px] truncate ${
                i === index
                  ? "bg-[#e8bc69] text-[#0F172A]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title={a.fileName}
            >
              {a.fileName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
