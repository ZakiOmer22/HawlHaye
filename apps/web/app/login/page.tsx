"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";

const SHOW_DEMO_ACCOUNTS = process.env.NODE_ENV !== "production";

const DEMO_ACCOUNTS = SHOW_DEMO_ACCOUNTS
  ? [
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
    ]
  : [];

const DEMO_PASSWORD = SHOW_DEMO_ACCOUNTS ? "12345678" : "";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [code, setCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  function resetToLogin() {
    setRequires2FA(false);
    setCode("");
    setTempToken("");
    setIsBackupCode(false);
    setError(null);
  }

  const isCodeValid = isBackupCode ? code.replace(/[-\s]/g, "").length === 10 : code.length === 6;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (requires2FA) {
        await api("/auth/2fa/authenticate", {
          method: "POST",
          body: JSON.stringify({
            code: isBackupCode ? code.replace(/[-\s]/g, "").toUpperCase() : code,
            tempToken,
            isBackupCode,
          }),
        });
      } else {
        const res = await api<{ data: { requires2FA?: boolean; tempToken?: string } }>(
          "/auth/login",
          {
            method: "POST",
            body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
          },
        );

        if (res.data.requires2FA) {
          setRequires2FA(true);
          setTempToken(res.data.tempToken!);
          setSubmitting(false);
          return;
        }
      }

      router.replace("/board");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case "invalid_credentials":
            setError("Incorrect email or password.");
            return;
          case "invalid_token":
            setError(
              isBackupCode
                ? "Invalid or already-used backup code."
                : "Invalid or expired authentication code.",
            );
            return;
          case "account_locked":
            setError("This account is temporarily locked. Try again later.");
            return;
          case "too_many_requests":
            setError("Too many attempts. Wait a few minutes and try again.");
            return;
          case "password_change_required":
            router.push("/change-password");
            return;
          case "csrf_failed":
            setError("Session expired. Please try again.");
            return;
          case "forbidden":
            if (err.message.toLowerCase().includes("deactivated")) {
              setError("Your account has been deactivated. Please contact your Administrator.");
            } else {
              setError("You do not have permission to sign in.");
            }
            return;
          default:
            setError(err.message || "Sign-in failed.");
            return;
        }
      }
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasskeyLogin() {
    if (!email) {
      setError("Please enter your email address first, then click 'Sign in with Passkey'.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const optionsRes = await api<{ data: Record<string, unknown> }>(
        "/auth/passkeys/login/options",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        },
      );

      const authResponse = await startAuthentication({
        optionsJSON: optionsRes.data as unknown as Parameters<
          typeof startAuthentication
        >[0]["optionsJSON"],
      });

      await api("/auth/passkeys/login/verify", {
        method: "POST",
        body: JSON.stringify(authResponse),
      });

      router.replace("/board");
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Passkey authentication cancelled.");
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Passkey login failed. Make sure you have registered a passkey for this account.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0F172A] text-white font-sans selection:bg-[#e8bc69]/30">
      {/* ── Left Side: Form ── */}
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
            <h1 className="text-3xl font-black text-white sm:text-4xl">
              {requires2FA ? (isBackupCode ? "Backup Code" : "Two-Factor Auth.") : "Welcome back."}
            </h1>
            <p className="mt-3 text-base text-[#94A3B8]">
              {requires2FA
                ? isBackupCode
                  ? "Enter one of your 10-character backup recovery codes."
                  : "Enter the 6-digit code from your authenticator app."
                : "Sign in to continue to your institutional workspace."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {!requires2FA ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#94A3B8]"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748B]"
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
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] py-3.5 pl-11 pr-4 text-base font-medium text-white placeholder-[#64748B] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#94A3B8]"
                    >
                      Password
                    </label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs font-bold text-[#94A3B8] hover:text-white transition focus:outline-none"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-bold text-[#e8bc69] hover:text-[#f1cf8b] transition focus:outline-none"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#64748B]"
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
                      maxLength={128}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] py-3.5 pl-11 pr-12 text-base font-medium text-white placeholder-[#64748B] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="otp"
                  className="block text-xs font-extrabold uppercase tracking-[0.15em] text-[#94A3B8]"
                >
                  {isBackupCode ? "Backup Recovery Code" : "Authentication Code"}
                </label>
                <input
                  id="otp"
                  type="text"
                  required
                  autoFocus
                  maxLength={isBackupCode ? 11 : 6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={isBackupCode ? "XXXXX-XXXXX" : "000000"}
                  className={`w-full rounded-xl border border-[#334155] bg-[#1E293B] py-3.5 px-4 text-center font-mono text-white placeholder-[#334155] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69] ${
                    isBackupCode ? "text-lg tracking-widest" : "text-2xl tracking-[0.5em]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupCode(!isBackupCode);
                    setCode("");
                    setError(null);
                  }}
                  className="text-xs text-[#94A3B8] hover:text-[#e8bc69] transition"
                >
                  {isBackupCode ? "Use authenticator code instead" : "Use a backup code instead"}
                </button>
              </div>
            )}

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

            <button
              type="submit"
              disabled={submitting || (requires2FA ? !isCodeValid : !email || !password)}
              className="w-full rounded-xl bg-[#e8bc69] px-5 py-4 text-base font-extrabold text-[#0F172A] shadow-[0_0_20px_rgba(232,188,105,0.15)] transition-all hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[#e8bc69] focus:ring-offset-2 focus:ring-offset-[#0F172A]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0F172A]/30 border-t-[#0F172A]" />
                  {requires2FA ? "Verifying..." : "Signing in..."}
                </span>
              ) : requires2FA ? (
                isBackupCode ? (
                  "Verify Backup Code"
                ) : (
                  "Verify Code"
                )
              ) : (
                "Sign in to Workspace"
              )}
            </button>

            {requires2FA && (
              <button
                type="button"
                onClick={resetToLogin}
                className="w-full text-center text-xs text-[#94A3B8] hover:text-white transition"
              >
                Back to login
              </button>
            )}

            {!requires2FA && (
              <>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-[#334155]"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Or
                  </span>
                  <div className="flex-grow border-t border-[#334155]"></div>
                </div>

                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={submitting}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-5 py-4 text-base font-extrabold text-white transition hover:bg-[#334155] hover:border-[#475569] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  <Fingerprint size={20} className="text-[#e8bc69]" />
                  Sign in with Passkey
                </button>
              </>
            )}
          </form>

          {SHOW_DEMO_ACCOUNTS && !requires2FA && (
            <div className="mt-12 rounded-2xl border border-[#334155] bg-[#1E293B] p-6 shadow-lg shadow-black/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#94A3B8] flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Demo Accounts (Dev Only)
                </p>
                <span className="text-[10px] font-bold text-[#0F172A] bg-[#e8bc69] px-2.5 py-1 rounded-md w-fit">
                  PASS: {DEMO_PASSWORD}
                </span>
              </div>
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
          )}

          <p className="mt-8 text-center text-xs font-medium leading-6 text-[#64748B]">
            Accounts are managed by the CECIT administrator. <br />
            Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>

      {/* ── Right Side: Decorative ── */}
      <div className="relative hidden overflow-hidden bg-[#1E293B] border-l border-[#334155] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-16">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-[#334155]" />
        <div className="absolute -right-20 top-0 h-[450px] w-[450px] rounded-full border border-[#e8bc69]/10" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full border border-[#334155]" />
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

        <div className="relative z-10 space-y-6 text-base font-medium text-[#94A3B8]">
          {[
            "Structured six-stage workflow",
            "Role-based permissions enforced on the server",
            "Full audit trail for every task change",
            "Institutional reports and dashboards",
          ].map((line) => (
            <div key={line} className="flex items-center gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F172A] border border-[#334155]">
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
