"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { KeyRound, Loader2, Check, Copy, Download, RefreshCw, AlertCircle } from "lucide-react";

export function BackupCodesCard() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const r = await api<{ data: { remaining: number } }>("/auth/2fa/backup-codes");
      setRemaining(r.data.remaining);
    } catch {
      setRemaining(null);
    }
  }, []);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  async function regenerate() {
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ data: { backupCodes: string[] } }>(
        "/auth/2fa/backup-codes/regenerate",
        { method: "POST", body: JSON.stringify({ password }) },
      );
      setCodes(r.data.backupCodes);
      setShowConfirm(false);
      setPassword("");
      await loadCount();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to regenerate codes");
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    if (!codes) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function downloadTxt() {
    if (!codes) return;
    const content = [
      "HAWLHAYE — Backup Recovery Codes",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Each code can only be used ONCE. Store them somewhere safe.",
      "",
      ...codes,
      "",
      "If you lose access to your authenticator, use one of these codes at login.",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hawl-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155]">
            <KeyRound className="h-5 w-5 text-[#e8bc69]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Backup Codes</h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Single-use recovery codes. Use one if you lose access to your authenticator app.
            </p>
            {remaining !== null && (
              <p className="mt-2 text-xs font-bold">
                <span className={remaining === 0 ? "text-red-400" : "text-emerald-400"}>
                  {remaining} of 10 codes remaining
                </span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={busy || remaining === null}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#334155] transition disabled:opacity-50"
        >
          <RefreshCw size={14} />
          {remaining === 0 ? "Generate" : "Regenerate"}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-400">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Confirmation */}
      {showConfirm && !codes && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm font-bold text-amber-400">
            This will invalidate your current codes and generate 10 new ones.
          </p>
          <input
            type="password"
            placeholder="Confirm your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#334155] bg-[#0F172A] py-2.5 px-4 text-sm text-white outline-none focus:border-amber-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowConfirm(false);
                setPassword("");
                setError(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#94A3B8] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => void regenerate()}
              disabled={busy || !password}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-[#0F172A] hover:bg-amber-400 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Generate
            </button>
          </div>
        </div>
      )}

      {/* New codes display */}
      {codes && (
        <div className="mt-4 rounded-xl border border-[#334155] bg-[#0F172A] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">
              Save these codes now — they won&apos;t be shown again
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => void copyAll()}
                className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition"
                title="Copy all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <button
                onClick={downloadTxt}
                className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition"
                title="Download .txt"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {codes.map((c) => (
              <div
                key={c}
                className="rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-center text-sm font-mono font-bold text-[#e8bc69] tracking-wider"
              >
                {c}
              </div>
            ))}
          </div>
          <button
            onClick={() => setCodes(null)}
            className="mt-4 w-full rounded-xl bg-[#e8bc69] px-4 py-2 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition"
          >
            I&apos;ve saved these codes
          </button>
        </div>
      )}
    </div>
  );
}
