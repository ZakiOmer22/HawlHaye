"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { KeyRound, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

// Exact same policy as the reset password page
const POLICY = [
  { key: "len-min", test: (p: string) => p.length >= 12, label: "At least 12 characters" },
  { key: "len-max", test: (p: string) => p.length <= 128, label: "At most 128 characters" },
  { key: "upper", test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { key: "lower", test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { key: "digit", test: (p: string) => /[0-9]/.test(p), label: "One digit" },
] as const;

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const rules = useMemo(() => POLICY.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allRulesPass = rules.every((r) => r.ok);
  const match = password.length > 0 && password === confirmPassword;
  const canSubmit = !loading && allRulesPass && match && token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      await api("/users/invite/accept", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "invalid_invite") {
          setError("This invite link is invalid, expired, or has already been used.");
        } else if (err.code === "conflict") {
          setError("An account with this email already exists. Please log in instead.");
        } else if (err.code === "validation_failed") {
          setError(err.message || "Password does not meet the enterprise security requirements.");
        } else {
          setError(err.message || "Failed to accept invitation.");
        }
      } else {
        setError("Could not reach the server. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <p className="font-bold mb-1">Invalid Invite Link</p>
          <p className="text-red-300/80">
            This page requires a valid invite token. Please check your email or contact the CECIT
            Administrator.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-center text-base font-extrabold text-[#0B132B] transition hover:bg-[#f1cf8b]"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-6 text-sm text-emerald-300">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
          <h2 className="text-xl font-bold mb-1">Account Activated!</h2>
          <p className="text-emerald-300/80">
            Your password has been set successfully. Redirecting you to sign in…
          </p>
        </div>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#e8bc69]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0]"
        >
          Create Password
        </label>
        <div className="relative">
          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#555570]" />
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
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#A0ABC0] hover:text-white transition"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Live Password Policy Checklist */}
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
          Confirm Password
        </label>
        <div className="relative">
          <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#555570]" />
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
            placeholder="Re-enter your password"
            maxLength={128}
            className="w-full rounded-xl border border-[#2A3754] bg-[#1C2541] py-3.5 pl-11 pr-4 text-base font-medium text-white placeholder-[#555570] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
          />
        </div>
        {confirmPassword.length > 0 && !match && (
          <p className="mt-1 text-xs font-medium text-red-400">Passwords do not match</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-base font-extrabold text-[#0B132B] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#0B132B]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin" />
            Activating Account...
          </span>
        ) : (
          "Accept Invitation & Activate"
        )}
      </button>
    </form>
  );
}

export default function AcceptInvitePage() {
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
            <h1 className="text-3xl font-black text-white sm:text-4xl">Welcome to the team.</h1>
            <p className="mt-3 text-base text-[#A0ABC0]">
              Your invitation is valid. Set a secure password to activate your HAWLHAYE account and
              start managing tasks.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#e8bc69]" />
              </div>
            }
          >
            <AcceptInviteForm />
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
            Secure Setup
          </div>
          <h2 className="text-5xl font-black leading-[1.15] text-white">
            One platform.
            <br />
            Total clarity.
            <br />
            <span className="text-[#e8bc69]">Let's get to work.</span>
          </h2>
        </div>

        <div className="relative z-10 space-y-6 text-base font-medium text-[#A0ABC0]">
          {[
            "Your password is hashed with Argon2id",
            "Your account is protected by enterprise security",
            "All tasks and updates are logged for accountability",
            "Contact the CECIT Administrator if you need help",
          ].map((line) => (
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
