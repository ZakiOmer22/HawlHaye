"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

const POLICY = [
  { key: "len-min", test: (p: string) => p.length >= 12, label: "At least 12 characters" },
  { key: "len-max", test: (p: string) => p.length <= 128, label: "At most 128 characters" },
  { key: "upper", test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { key: "lower", test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { key: "digit", test: (p: string) => /[0-9]/.test(p), label: "One digit" },
] as const;

const SECURITY_FEATURES = [
  "Passwords are hashed with Argon2id — never stored in plaintext",
  "All other active sessions will be signed out automatically",
  "Every password change is written to the audit log",
  "Session tokens are HttpOnly, SameSite=Lax cookies",
];

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rules = useMemo(
    () => POLICY.map((r) => ({ ...r, ok: r.test(newPassword) })),
    [newPassword],
  );
  const allRulesPass = rules.every((r) => r.ok);
  const match = newPassword.length > 0 && newPassword === confirmPassword;
  const sameAsCurrent =
    currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword;
  const canSubmit =
    !submitting && currentPassword.length > 0 && allRulesPass && match && !sameAsCurrent;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSubmitting(true);

    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case "invalid_credentials":
            setError("Current password is incorrect.");
            return;
          case "validation_failed":
            setError(err.message || "Password does not meet requirements.");
            return;
          case "csrf_failed":
            setError("Session expired. Please sign in again.");
            setTimeout(() => router.push("/login"), 1500);
            return;
          case "unauthenticated":
          case "session_idle":
            router.push("/login");
            return;
          case "too_many_requests":
            setError("Too many attempts. Wait a few minutes and try again.");
            return;
          default:
            setError(err.message || "Could not change password.");
            return;
        }
      }
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0B132B] text-[#F8FAFC] font-sans selection:bg-[#e8bc69]/30">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 sm:px-12 xl:px-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(232,188,105,0.05),_transparent_60%)] pointer-events-none" />

        <div className="mx-auto w-full max-w-md relative z-10">
          <Link
            href="/dashboard"
            className="mb-12 inline-flex items-center gap-4 transition hover:opacity-80 group"
          >
            <div className="relative">
              <img
                src="/logo.png"
                alt="HAWLHAYE Logo"
                className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                style={{ display: "none" }}
                className="h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#142b4a] to-[#0A1628] border border-[#e8bc69]/30 text-2xl font-black text-[#e8bc69] shadow-lg shadow-black/50"
              >
                H
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-[0.16em] text-white">HAWLHAYE</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A0ABC0]">
                Work. Organised.
              </p>
            </div>
          </Link>

          <div className="mb-10">
            <h1 className="text-3xl font-black text-white sm:text-4xl">Change password.</h1>
            <p className="mt-3 text-base text-[#A0ABC0]">
              Choose a strong password you don&apos;t use anywhere else. Other devices signed into
              your account will be signed out.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="currentPassword"
                className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0]"
              >
                Current password
              </label>
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#555570]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  aria-invalid={!!error}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your current password"
                  maxLength={200}
                  className="w-full rounded-xl border border-[#2A3754] bg-[#1C2541] py-3.5 pl-11 pr-16 text-base font-medium text-white placeholder-[#555570] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A0ABC0] hover:text-white transition focus:outline-none"
                >
                  {showCurrent ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0]"
              >
                New password
              </label>
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#555570]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  aria-invalid={!!error}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  maxLength={128}
                  className="w-full rounded-xl border border-[#2A3754] bg-[#1C2541] py-3.5 pl-11 pr-16 text-base font-medium text-white placeholder-[#555570] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A0ABC0] hover:text-white transition focus:outline-none"
                >
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>

              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {rules.map((r) => (
                  <li
                    key={r.key}
                    className={`flex items-center gap-2 text-xs font-medium transition ${
                      r.ok ? "text-emerald-400" : "text-[#555570]"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                        r.ok
                          ? "border-emerald-500/40 bg-emerald-500/20"
                          : "border-[#2A3754] bg-[#0B132B]"
                      }`}
                    >
                      {r.ok ? "✓" : ""}
                    </span>
                    {r.label}
                  </li>
                ))}
                {sameAsCurrent && (
                  <li className="flex items-center gap-2 text-xs font-medium text-amber-400 sm:col-span-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/20 text-[10px]">
                      !
                    </span>
                    New password must differ from current password
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0]"
              >
                Confirm new password
              </label>
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#555570]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <input
                  id="confirmPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter your new password"
                  maxLength={128}
                  className="w-full rounded-xl border border-[#2A3754] bg-[#1C2541] py-3.5 pl-11 pr-4 text-base font-medium text-white placeholder-[#555570] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                />
              </div>
              {confirmPassword.length > 0 && !match && (
                <p className="mt-1 text-xs font-medium text-red-400">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400"
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={submitting}
                className="flex-1 rounded-xl border border-[#2A3754] bg-[#1C2541]/40 px-5 py-4 text-base font-bold text-white transition hover:border-[#e8bc69]/50 hover:text-[#e8bc69] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-[2] rounded-xl bg-[#e8bc69] px-5 py-4 text-base font-extrabold text-[#0B132B] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#0B132B]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0B132B]/30 border-t-[#0B132B]" />
                    Saving...
                  </span>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs font-medium leading-6 text-[#555570]">
            Forgot your current password? <br />
            Contact the <strong className="text-[#A0ABC0]">CECIT Administrator</strong> to reset it.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[#1C2541] border-l border-[#2A3754] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-16">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-[#2A3754]" />
        <div className="absolute -right-20 top-0 h-[450px] w-[450px] rounded-full border border-[#e8bc69]/10" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full border border-[#2A3754]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e8bc69]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8bc69]/30 bg-[#e8bc69]/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#e8bc69] mb-8">
            Account Security
          </div>
          <h2 className="text-5xl font-black leading-[1.15] text-white">
            Strong passwords.
            <br />
            Secure sessions.
            <br />
            <span className="text-[#e8bc69]">Peace of mind.</span>
          </h2>
        </div>

        <div className="relative z-10 space-y-6 text-base font-medium text-[#A0ABC0]">
          {SECURITY_FEATURES.map((line) => (
            <div key={line} className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B132B] border border-[#2A3754]">
                <svg
                  className="h-4 w-4 text-[#e8bc69]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
