"use client";

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Fingerprint,
  ShieldAlert,
  Trash2,
  X,
  Copy,
  Download,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { ActiveSessionsCard } from "@/components/layout/ActiveSessionsCard";
import { BackupCodesCard } from "@/components/layout/BackupCodesCard";

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [passkeys, setPasskeys] = useState<{ id: string; createdAt: string }[]>([]);

  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [code, setCode] = useState("");

  // Codes revealed immediately after enabling 2FA
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);

  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      try {
        const [meRes, pkRes] = await Promise.all([
          api<{ data: { twoFactorEnabled: boolean } }>("/auth/me"),
          api<{ data: { id: string; createdAt: string }[] }>("/auth/passkeys"),
        ]);
        setIs2FAEnabled(meRes.data.twoFactorEnabled);
        setPasskeys(pkRes.data);
      } catch {
        setError("Failed to load security status");
      } finally {
        setLoading(false);
      }
    }
    void loadStatus();
  }, []);

  async function startSetup() {
    setActionBusy(true);
    setError(null);
    try {
      const res = await api<{ data: { secret: string; qrCodeUrl: string } }>("/auth/2fa/setup", {
        method: "POST",
      });
      setSetupData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to setup 2FA");
    } finally {
      setActionBusy(false);
    }
  }

  async function verifySetup() {
    setActionBusy(true);
    setError(null);
    try {
      const res = await api<{ data: { success: boolean; backupCodes: string[] } }>(
        "/auth/2fa/verify",
        {
          method: "POST",
          body: JSON.stringify({ token: code }),
        },
      );
      setIs2FAEnabled(true);
      setSetupData(null);
      setCode("");
      setFreshCodes(res.data.backupCodes ?? null);
      setSuccessMsg("Two-Factor Authentication has been enabled.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      setActionBusy(false);
    }
  }

  async function disable2FA() {
    if (!disablePassword) return;
    setActionBusy(true);
    setError(null);
    try {
      await api("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: disablePassword }),
      });
      setIs2FAEnabled(false);
      setShowDisableModal(false);
      setDisablePassword("");
      setFreshCodes(null);
      setSuccessMsg("Two-Factor Authentication has been disabled.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to disable 2FA");
    } finally {
      setActionBusy(false);
    }
  }

  async function addPasskey() {
    setActionBusy(true);
    setError(null);
    try {
      const optionsRes = await api<{ data: Record<string, unknown> }>(
        "/auth/passkeys/register/options",
        { cache: "no-store" },          // ← ADD THIS LINE
      );

      const regResponse = await startRegistration({
        optionsJSON: optionsRes.data as unknown as Parameters<
          typeof startRegistration
        >[0]["optionsJSON"],
      });

      await api("/auth/passkeys/register/verify", {
        method: "POST",
        body: JSON.stringify(regResponse),
      });

      setSuccessMsg("Passkey added successfully!");
      const pkRes = await api<{ data: { id: string; createdAt: string }[] }>("/auth/passkeys");
      setPasskeys(pkRes.data);
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Passkey creation cancelled.");
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to add passkey");
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function deletePasskey(id: string) {
    setActionBusy(true);
    try {
      await api(`/auth/passkeys/${id}`, { method: "DELETE" });
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setSuccessMsg("Passkey removed.");
    } catch {
      setError("Failed to remove passkey");
    } finally {
      setActionBusy(false);
    }
  }

  async function copyFreshCodes() {
    if (!freshCodes) return;
    try {
      await navigator.clipboard.writeText(freshCodes.join("\n"));
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function downloadFreshCodes() {
    if (!freshCodes) return;
    const content = [
      "HAWLHAYE — Backup Recovery Codes",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Each code can only be used ONCE. Store them somewhere safe.",
      "",
      ...freshCodes,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hawl-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8bc69]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black text-white">Security Settings</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Manage your account security and authentication methods.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} /> {successMsg}
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-xs hover:underline opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {/* ── 1. Two-Factor Authentication Card ── */}
        <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155]">
                  <ShieldCheck className="h-5 w-5 text-[#e8bc69]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-3">
                    Two-Factor Authentication
                    {is2FAEnabled ? (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                        Enabled
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-500/20">
                        Disabled
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    Add an extra layer of security to your account by requiring a code from your
                    authenticator app when logging in.
                  </p>
                </div>
              </div>

              {!is2FAEnabled && !setupData && (
                <button
                  onClick={startSetup}
                  disabled={actionBusy}
                  className="shrink-0 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition"
                >
                  Enable 2FA
                </button>
              )}
              {is2FAEnabled && (
                <button
                  onClick={() => setShowDisableModal(true)}
                  className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/20 transition"
                >
                  Disable
                </button>
              )}
            </div>

            {setupData && (
              <div className="mt-6 border-t border-[#334155] pt-6 flex flex-col md:flex-row gap-8 items-center md:items-start">
                <div className="text-center">
                  <p className="text-sm font-bold text-white mb-3">1. Scan this QR code</p>
                  <div className="bg-white p-2 rounded-xl inline-block">
                    <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="h-40 w-40" />
                  </div>
                </div>
                <div className="flex-1 w-full space-y-4">
                  <p className="text-sm font-bold text-white">2. Enter the 6-digit code</p>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="000000"
                      className="w-full max-w-[200px] rounded-xl border border-[#334155] bg-[#0F172A] py-3 px-4 text-center text-xl tracking-[0.5em] text-white outline-none focus:border-[#e8bc69]"
                    />
                    <p className="text-xs text-[#94A3B8]">
                      Or manually enter the code:{" "}
                      <code className="text-[#e8bc69] select-all">{setupData.secret}</code>
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={verifySetup}
                      disabled={actionBusy || code.length !== 6}
                      className="rounded-xl bg-[#e8bc69] px-5 py-2 text-sm font-bold text-[#0F172A] disabled:opacity-50"
                    >
                      {actionBusy ? "Verifying..." : "Verify & Activate"}
                    </button>
                    <button
                      onClick={() => setSetupData(null)}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-[#94A3B8] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Passkeys Card ── */}
        <div className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155]">
                <Fingerprint className="h-5 w-5 text-[#e8bc69]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  Passkeys
                  {passkeys.length > 0 ? (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                      Enabled
                    </span>
                  ) : (
                    <span className="rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-500/20">
                      Disabled
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-[#94A3B8]">
                  Sign in with your fingerprint, face, or screen lock instead of a password.
                </p>
              </div>
            </div>
            <button
              onClick={addPasskey}
              disabled={actionBusy}
              className="shrink-0 rounded-xl border border-[#334155] bg-[#0F172A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#334155] transition disabled:opacity-50"
            >
              {actionBusy ? <Loader2 size={16} className="animate-spin" /> : "Add Passkey"}
            </button>
          </div>

          {passkeys.length > 0 && (
            <div className="mt-6 border-t border-[#334155] pt-4 space-y-3">
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                Registered Passkeys
              </p>
              {passkeys.map((pk) => (
                <div
                  key={pk.id}
                  className="flex items-center justify-between rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-white font-medium">Device Passkey</span>
                    <span className="text-xs text-[#64748B]">
                      {new Date(pk.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deletePasskey(pk.id)}
                    disabled={actionBusy}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Backup Codes Card (only shows when 2FA is on) ── */}
        {is2FAEnabled && <BackupCodesCard />}

        {/* ── 4. Active Sessions Card ── */}
        <ActiveSessionsCard />
      </div>

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDisableModal(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-[#334155] bg-[#1E293B] p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                <ShieldAlert className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Disable 2FA</h2>
              <p className="text-sm text-[#94A3B8]">
                You are about to remove the extra security layer from your account. Please confirm
                your password.
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter your current password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] py-3 px-4 text-sm text-white outline-none focus:border-red-400"
              />

              {error && <p className="text-xs text-red-400 text-center">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowDisableModal(false)}
                  className="flex-1 rounded-xl border border-[#334155] bg-[#0F172A] py-2.5 text-sm font-bold text-white hover:bg-[#334155] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={disable2FA}
                  disabled={actionBusy || !disablePassword}
                  className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition"
                >
                  {actionBusy ? <Loader2 size={16} className="animate-spin" /> : "Disable 2FA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fresh Backup Codes Modal (shown right after enabling 2FA) */}
      {freshCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-3xl border border-[#e8bc69]/30 bg-[#1E293B] p-8 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Save your backup codes</h2>
                <p className="text-sm text-[#94A3B8] mt-1">
                  These codes will only be shown once. Each can be used one time to sign in if you
                  lose access to your authenticator.
                </p>
              </div>
              <button
                onClick={() => setFreshCodes(null)}
                className="shrink-0 rounded-lg p-2 text-[#94A3B8] hover:text-white hover:bg-[#0F172A] transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                  Recovery codes
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => void copyFreshCodes()}
                    className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition"
                    title="Copy all"
                  >
                    {codesCopied ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                  <button
                    onClick={downloadFreshCodes}
                    className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition"
                    title="Download .txt"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {freshCodes.map((c) => (
                  <div
                    key={c}
                    className="rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-center text-sm font-mono font-bold text-[#e8bc69] tracking-wider"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setFreshCodes(null)}
              className="mt-5 w-full rounded-xl bg-[#e8bc69] px-4 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition"
            >
              I&apos;ve saved these codes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
