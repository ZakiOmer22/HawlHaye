"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    email: "admin@mail.com",
    color: "bg-slate-500/10 text-slate-300 border-slate-500/20 hover:bg-slate-500/20",
  },
  {
    label: "Dean",
    email: "dean@mail.com",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  },
  {
    label: "Deputy",
    email: "deputy@mail.com",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  },
  {
    label: "Faculty",
    email: "faculty@mail.com",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  },
  {
    label: "Labs",
    email: "labs@mail.com",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20",
  },
  {
    label: "Tech",
    email: "tech@mail.com",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  },
];

const DEMO_PASSWORD = "12345678";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMsg, setForgotMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
    setForgotMsg(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setForgotMsg(false);
    setSubmitting(true);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      router.replace("/board");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Incorrect email or password." : err.message);
      } else {
        setError("Could not reach the server. Please check your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0B132B] text-[#F8FAFC] font-sans selection:bg-[#e8bc69]/30">
      {/* ── Left Side: Form ─────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 sm:px-12 xl:px-24 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(232,188,105,0.05),_transparent_60%)] pointer-events-none" />

        <div className="mx-auto w-full max-w-md relative z-10">
          {/* Logo Area */}
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
              {/* Fallback "H" */}
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
            <h1 className="text-3xl font-black text-white sm:text-4xl">Welcome back.</h1>
            <p className="mt-3 text-base text-[#A0ABC0]">
              Sign in to continue to your institutional workspace.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0]"
              >
                Email address
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  aria-invalid={!!error}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="you@cecit.edu.so"
                  className="w-full rounded-xl border border-[#2A3754] bg-[#1C2541] py-3.5 pl-11 pr-4 text-base font-medium text-white placeholder-[#555570] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0]"
                >
                  Password
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-bold text-[#A0ABC0] hover:text-white transition focus:outline-none"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotMsg(true)}
                    className="text-xs font-bold text-[#e8bc69] hover:text-white transition focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
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
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  aria-invalid={!!error}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#2A3754] bg-[#1C2541] py-3.5 pl-11 pr-12 text-base font-medium text-white placeholder-[#555570] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                />
              </div>
            </div>

            {/* Error Message */}
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

            {/* Forgot Password Info Box */}
            {forgotMsg && (
              <div
                role="alert"
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400"
              >
                <strong className="block mb-1">Password Reset Required</strong>
                This is a secure institutional system. Password resets cannot be done via email.
                Please contact the <strong>CECIT Administrator</strong> to reset your password.
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-base font-extrabold text-[#0B132B] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#0B132B]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0B132B]/30 border-t-[#0B132B]" />
                  Signing in...
                </span>
              ) : (
                "Sign in to Workspace"
              )}
            </button>
          </form>

          {/* ── Demo Accounts ─────────────────────────────────── */}
          <div className="mt-12 rounded-2xl border border-[#2A3754] bg-[#1C2541]/60 p-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#A0ABC0] flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Demo Accounts (Dev Only)
              </p>
              <span className="text-[10px] font-bold text-[#0B132B] bg-[#e8bc69] px-2.5 py-1 rounded-md w-fit">
                PASS: {DEMO_PASSWORD}
              </span>
            </div>
            <p className="text-sm text-[#A0ABC0] mb-5">
              Click a role to instantly auto-fill the credentials:
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email)}
                  className={`rounded-lg border px-3 py-2.5 text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-1 focus:ring-[#e8bc69] ${acc.color}`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-xs font-medium leading-6 text-[#555570]">
            Accounts are managed by the CECIT administrator. <br />
            Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>

      {/* ── Right Side: Decorative (Hidden on Mobile) ───────── */}
      <div className="relative hidden overflow-hidden bg-[#1C2541] border-l border-[#2A3754] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-16">
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-[#2A3754]" />
        <div className="absolute -right-20 top-0 h-[450px] w-[450px] rounded-full border border-[#e8bc69]/10" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full border border-[#2A3754]" />

        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e8bc69]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8bc69]/30 bg-[#e8bc69]/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#e8bc69] mb-8">
            Institutional Platform
          </div>
          <h2 className="text-5xl font-black leading-[1.15] text-white">
            One workspace.
            <br />
            Clear ownership.
            <br />
            <span className="text-[#e8bc69]">Every task visible.</span>
          </h2>
        </div>

        <div className="relative z-10 space-y-6 text-base font-medium text-[#A0ABC0]">
          {[
            "Structured six-stage workflow",
            "Role-based permissions enforced on the server",
            "Full audit trail for every task change",
            "Institutional reports and dashboards",
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
