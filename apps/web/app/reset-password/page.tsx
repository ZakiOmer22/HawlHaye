"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  "Reset tokens are hashed with HMAC-SHA256 at rest",
  "Links expire in 60 minutes and can only be used once",
  "All sessions are signed out after a reset",
  "Every reset is written to the audit log",
];

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const rules = useMemo(() => POLICY.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allRulesPass = rules.every((r) => r.ok);
  const match = password.length > 0 && password === confirmPassword;
  const canSubmit = !submitting && allRulesPass && match;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case "invalid_token":
            setError("This reset link is invalid or has expired. Request a new one.");
            return;
          case "validation_failed":
            setError(err.message || "Password does not meet requirements.");
            return;
          case "too_many_requests":
            setError("Too many attempts. Wait a few minutes and try again.");
            return;
          default:
            setError(err.message || "Could not reset password.");
            return;
        }
      }
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token || token.length < 32) {
    return (
      <div className="space-y-6">
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300"
        >
          <p className="font-bold mb-1">Invalid reset link</p>
          <p className="text-red-300/80">
            This page requires a valid reset token. Request a new link or contact the CECIT
            Administrator.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="block w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-center text-base font-extrabold text-[#0B132B] transition hover:bg-[#f1cf8b]"
        >
          Request a New Link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div
          role="status"
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300"
        >
          <p className="font-bold mb-1">Password updated</p>
          <p className="text-emerald-300/80">
            All previous sessions have been signed out. Redirecting to sign in…
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-center text-base font-extrabold text-[#0B132B] transition hover:bg-[#f1cf8b]"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="password"
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
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="••••••••••••"
            maxLength={128}
            className="w-full rounded-xl border border-[#2A3754] bg-[#1C2541] py-3.5 pl-11 pr-16 text-base font-medium text-white placeholder-[#555570] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#A0ABC0] hover:text-white transition"
          >
            {showPassword ? "Hide" : "Show"}
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
                  r.ok ? "border-emerald-500/40 bg-emerald-500/20" : "border-[#2A3754] bg-[#0B132B]"
                }`}
              >
                {r.ok ? "✓" : ""}
              </span>
              {r.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0]"
        >
          Confirm password
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
            type={showPassword ? "text" : "password"}
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
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-base font-extrabold text-[#0B132B] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#0B132B]"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0B132B]/30 border-t-[#0B132B]" />
            Resetting...
          </span>
        ) : (
          "Reset Password"
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen bg-[#0B132B] text-[#F8FAFC] font-sans selection:bg-[#e8bc69]/30">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 sm:px-12 xl:px-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(232,188,105,0.05),_transparent_60%)] pointer-events-none" />

        <div className="mx-auto w-full max-w-md relative z-10">
          <Link
            href="/"
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
            <h1 className="text-3xl font-black text-white sm:text-4xl">Set a new password.</h1>
            <p className="mt-3 text-base text-[#A0ABC0]">
              Choose a strong password you don&apos;t use anywhere else. Your reset link can only be
              used once.
            </p>
          </div>

          <Suspense fallback={<div className="text-[#A0ABC0]">Loading…</div>}>
            <ResetForm />
          </Suspense>

          <p className="mt-8 text-center text-xs font-medium leading-6 text-[#555570]">
            Accounts are managed by the CECIT administrator. <br />
            Unauthorized access is strictly prohibited.
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
            Secure Reset
          </div>
          <h2 className="text-5xl font-black leading-[1.15] text-white">
            One-time link.
            <br />
            Hashed storage.
            <br />
            <span className="text-[#e8bc69]">Clean slate.</span>
          </h2>
        </div>

        <div className="relative z-10 space-y-6 text-base font-medium text-[#A0ABC0]">
          {SECURITY_FEATURES.map((line) => (
            <div key={line} className="flex items-center gap-4">
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
