"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // Endpoint always returns 204 — we deliberately do NOT tell the user
      // whether the email exists.
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "too_many_requests") {
        setError("Too many requests. Wait a few minutes and try again.");
      } else {
        setError("Could not reach the server. Please check your connection.");
      }
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
            <h1 className="text-3xl font-black text-white sm:text-4xl">Forgot password?</h1>
            <p className="mt-3 text-base text-[#A0ABC0]">
              Enter the email address on your account. If an account exists, we&apos;ll send a
              password reset link.
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div
                role="status"
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300"
              >
                <p className="font-bold mb-1">Check your email</p>
                <p className="text-emerald-300/80">
                  If <strong>{email}</strong> matches an account, a reset link is on its way. The
                  link expires in 60 minutes.
                </p>
              </div>
              <p className="text-sm text-[#A0ABC0]">
                Didn&apos;t receive it? Contact the{" "}
                <strong className="text-white">CECIT Administrator</strong> for a manual reset.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-center text-base font-extrabold text-[#0B132B] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b]"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
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
                disabled={submitting || !email}
                className="w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-base font-extrabold text-[#0B132B] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#0B132B]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0B132B]/30 border-t-[#0B132B]" />
                    Sending...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <Link
                href="/login"
                className="block text-center text-sm font-bold text-[#A0ABC0] transition hover:text-white"
              >
                ← Back to sign in
              </Link>
            </form>
          )}

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
            Account Recovery
          </div>
          <h2 className="text-5xl font-black leading-[1.15] text-white">
            Locked out?
            <br />
            Not for long.
            <br />
            <span className="text-[#e8bc69]">Reset in one click.</span>
          </h2>
        </div>

        <div className="relative z-10 space-y-6 text-base font-medium text-[#A0ABC0]">
          {[
            "Reset links are single-use and expire in 60 minutes",
            "All active sessions are signed out after reset",
            "Every request is written to the audit log",
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
