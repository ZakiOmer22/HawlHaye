"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const isLengthValid = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid = isLengthValid && hasNumber && hasMatch;

  useEffect(() => {
    if (!token) setError("This invitation link is invalid or missing a token.");
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !token) return;
    setBusy(true);
    setError(null);

    try {
      // 👇 FIX: Add the /users prefix to match your backend router mount
      await api("/users/invite/accept", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "invalid_invite" || err.code === "invalid_token") {
          setError(
            "This invitation has expired or is no longer valid. Please contact your administrator.",
          );
        } else {
          setError(err.message || "Failed to accept invitation.");
        }
      } else {
        setError("Could not reach the server. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!token && !error) return null;

  return (
    <div className="flex min-h-screen bg-[#0F172A] text-white font-sans selection:bg-[#e8bc69]/30">
      {/* ── Left Side: Form ─────────────────────────────────── */}
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
                className="h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#e8bc69]/30 text-2xl font-black text-[#e8bc69] shadow-lg shadow-black/50"
              >
                H
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-[0.16em] text-white">HAWLHAYE</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
                Work. Organised.
              </p>
            </div>
          </Link>

          <div className="mb-10">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E293B] border border-[#334155] shadow-inner">
              <ShieldCheck className="h-7 w-7 text-[#e8bc69]" />
            </div>
            <h1 className="text-3xl font-black text-white">Set up your account.</h1>
            <p className="mt-3 text-base text-[#94A3B8]">
              You've been invited to HAWLHAYE. Create a secure password to continue.
            </p>
          </div>

          {error && !success && (
            <div
              role="alert"
              className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-bold text-red-400"
            >
              <AlertCircle className="h-6 w-6" />
              {error}
              {error.includes("expired") && (
                <Link href="/login" className="mt-2 text-xs text-[#e8bc69] hover:underline">
                  Return to login
                </Link>
              )}
            </div>
          )}

          {success && (
            <div className="space-y-6 text-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Account activated!</h2>
                <p className="mt-2 text-sm text-emerald-400/80">Redirecting to login...</p>
              </div>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#e8bc69]" />
            </div>
          )}

          {!success && token && (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#94A3B8]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] py-3.5 pl-4 pr-12 text-base font-medium text-white placeholder-[#64748B] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#94A3B8]">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] py-3.5 pl-4 pr-4 text-base font-medium text-white placeholder-[#64748B] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                />
              </div>

              <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4 text-xs space-y-2">
                <p className="font-bold text-[#94A3B8] mb-2 uppercase tracking-wider text-[10px]">
                  Password Requirements
                </p>
                <div
                  className={`flex items-center gap-2 ${isLengthValid ? "text-emerald-400" : "text-[#64748B]"}`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${isLengthValid ? "bg-emerald-400" : "bg-[#334155]"}`}
                  />
                  At least 8 characters
                </div>
                <div
                  className={`flex items-center gap-2 ${hasNumber ? "text-emerald-400" : "text-[#64748B]"}`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${hasNumber ? "bg-emerald-400" : "bg-[#334155]"}`}
                  />
                  Contains a number
                </div>
                <div
                  className={`flex items-center gap-2 ${hasMatch ? "text-emerald-400" : "text-[#64748B]"}`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${hasMatch ? "bg-emerald-400" : "bg-[#334155]"}`}
                  />
                  Passwords match
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || !isValid}
                className="w-full rounded-xl bg-[#e8bc69] px-5 py-4 mt-2 text-base font-extrabold text-[#0F172A] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#0F172A]"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0F172A]/30 border-t-[#0F172A]" />
                    Activating...
                  </span>
                ) : (
                  "Activate Account"
                )}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs font-medium leading-6 text-[#64748B]">
            Accounts are managed by the CECIT administrator. <br />
            Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>

      {/* ── Right Side: Decorative ─────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-[#1E293B] border-l border-[#334155] lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:p-16">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-[#334155]" />
        <div className="absolute -right-20 top-0 h-[450px] w-[450px] rounded-full border border-[#e8bc69]/10" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full border border-[#334155]" />

        <div className="relative z-10 max-w-lg mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8bc69]/30 bg-[#e8bc69]/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#e8bc69] mb-8">
            Institutional Platform
          </div>
          <h2 className="text-5xl font-black leading-[1.15] text-white">
            Secure.
            <br />
            Audited.
            <br />
            <span className="text-[#e8bc69]">Institutional grade.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F172A]" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
