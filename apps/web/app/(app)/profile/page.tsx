"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { usePreferences } from "@/lib/preferences";
import { LANGUAGES } from "@/lib/i18n";
import type { Role, Office } from "@/lib/types";
import {
  UserCircle2,
  Mail,
  Shield,
  Building2,
  Calendar,
  KeyRound,
  Laptop,
  Globe,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  LogOut,
} from "lucide-react";

type RawUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  officeId: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
};

interface Session {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function prettyDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function browserOf(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Unknown browser";
}

export default function ProfilePage() {
  const { language, theme, setLanguage, setTheme, t } = usePreferences();
  const [user, setUser] = useState<RawUser | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const load = useCallback(async () => {
    try {
      const [userResponse, officeResponse, sessionsResponse] = await Promise.all([
        api<{ data: RawUser }>("/auth/me"),
        api<{ data: Office[] }>("/offices").catch(() => ({ data: [] as Office[] })),
        api<{ data: Session[] }>("/auth/sessions").catch(() => ({ data: [] as Session[] })),
      ]);
      setUser(userResponse.data);
      setOffices(officeResponse.data);
      setSessions(sessionsResponse.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load profile");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revokeSession(s: Session) {
    if (
      !confirm("Sign out of this session? If this is your current device you will be logged out.")
    )
      return;
    setRevoking(s.id);
    try {
      await api(`/auth/sessions/${s.id}`, { method: "DELETE" });
      setSessions((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
      setAnnouncement("Session signed out.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign out that session");
    } finally {
      setRevoking(null);
    }
  }

  if (error && !user) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center"
        >
          <AlertCircle aria-hidden="true" className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Could not load profile</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!user || !sessions) {
    return (
      <div className="max-w-3xl mx-auto space-y-6" aria-busy="true" aria-label="Loading profile">
        <div className="h-10 w-64 motion-safe:animate-pulse rounded bg-[#1E293B]" />
        <div className="h-48 motion-safe:animate-pulse rounded-2xl bg-[#1E293B] border border-[#334155]" />
        <div className="h-48 motion-safe:animate-pulse rounded-2xl bg-[#1E293B] border border-[#334155]" />
      </div>
    );
  }

  const office = user.officeId ? offices.find((o) => o.id === user.officeId) : null;
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">Account</p>
        <h1 className="mt-1 text-3xl font-black text-white">{t("profile.title")}</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">{t("profile.subtitle")}</p>
      </header>

      {/* ── Your details ─────────────────────────────────────── */}
      <section
        aria-labelledby="details-heading"
        className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6"
      >
        <h2
          id="details-heading"
          className="text-sm font-extrabold uppercase tracking-wider text-white mb-4 flex items-center gap-2"
        >
          <UserCircle2 size={16} className="text-[#e8bc69]" aria-hidden="true" />
          {t("profile.details")}
        </h2>

        <div className="flex items-start gap-4 mb-6">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F172A] border border-[#334155] text-2xl font-black text-[#e8bc69]"
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-white truncate">{user.fullName}</p>
            <p className="text-sm text-[#e8bc69] font-bold uppercase tracking-wider mt-0.5">
              {roleLabel}
            </p>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] mb-1 flex items-center gap-1.5">
              <Mail size={12} aria-hidden="true" /> {t("profile.email")}
            </dt>
            <dd className="text-white font-bold break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] mb-1 flex items-center gap-1.5">
              <Shield size={12} aria-hidden="true" /> {t("profile.role")}
            </dt>
            <dd className="text-white font-bold">{roleLabel}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] mb-1 flex items-center gap-1.5">
              <Building2 size={12} aria-hidden="true" /> {t("profile.office")}
            </dt>
            <dd className="text-white font-bold">{office?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] mb-1 flex items-center gap-1.5">
              <Calendar size={12} aria-hidden="true" /> {t("profile.memberSince")}
            </dt>
            <dd className="text-white font-bold">{prettyDate(user.createdAt)}</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs text-[#94A3B8]">
          To change your name, role, or office, contact your Administrator.
        </p>
      </section>

      {/* ── Security ─────────────────────────────────────────── */}
      <section
        aria-labelledby="security-heading"
        className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6"
      >
        <h2
          id="security-heading"
          className="text-sm font-extrabold uppercase tracking-wider text-white mb-4 flex items-center gap-2"
        >
          <Shield size={16} className="text-[#e8bc69]" aria-hidden="true" />
          {t("security.title")}
        </h2>

        <div className="rounded-xl border border-[#334155] bg-[#0F172A] p-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound size={14} aria-hidden="true" /> {t("security.changePassword")}
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">{t("security.changePasswordHint")}</p>
            </div>
            <Link
              href="/change-password"
              className="shrink-0 rounded-lg bg-[#e8bc69] px-3 py-2 text-xs font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
            >
              {t("security.changePassword")}
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Laptop size={14} aria-hidden="true" /> {t("security.sessions")}
            </p>
            <span className="text-[10px] font-bold text-[#94A3B8] bg-[#1E293B] px-2 py-0.5 rounded border border-[#334155]">
              {sessions.length}
            </span>
          </div>

          {sessions.length === 0 ? (
            <p className="text-xs text-[#94A3B8] py-3">{t("security.noSessions")}</p>
          ) : (
            <ul role="list" className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[#334155] bg-[#1E293B]/60 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {browserOf(s.userAgent)}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {s.ip ?? "Unknown IP"} · {prettyDateTime(s.lastSeenAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revokeSession(s)}
                    disabled={revoking === s.id}
                    aria-label="Sign out this session"
                    className="shrink-0 flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    {revoking === s.id ? (
                      <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <LogOut size={11} aria-hidden="true" />
                    )}
                    {t("security.revoke")}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] text-[#94A3B8]">{t("security.sessionCurrentHint")}</p>
        </div>
      </section>

      {/* ── Preferences ─────────────────────────────────────── */}
      <section
        aria-labelledby="preferences-heading"
        className="rounded-2xl border border-[#334155] bg-[#1E293B] p-6"
      >
        <h2
          id="preferences-heading"
          className="text-sm font-extrabold uppercase tracking-wider text-white mb-4 flex items-center gap-2"
        >
          <Globe size={16} className="text-[#e8bc69]" aria-hidden="true" />
          {t("prefs.title")}
        </h2>

        <div className="mb-5">
          <p className="text-sm font-bold text-white mb-1">{t("prefs.language")}</p>
          <p className="text-xs text-[#94A3B8] mb-3">{t("prefs.languageHint")}</p>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                  language === l.code
                    ? "bg-[#e8bc69]/15 text-[#e8bc69] border-[#e8bc69]/40"
                    : "border-[#334155] bg-[#0F172A] text-[#A0ABC0] hover:border-[#e8bc69]/40 hover:text-white"
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-white mb-1">{t("prefs.theme")}</p>
          <p className="text-xs text-[#94A3B8] mb-3">{t("prefs.themeHint")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                theme === "dark"
                  ? "bg-[#e8bc69]/15 text-[#e8bc69] border-[#e8bc69]/40"
                  : "border-[#334155] bg-[#0F172A] text-[#A0ABC0] hover:border-[#e8bc69]/40 hover:text-white"
              }`}
            >
              <Moon size={16} aria-hidden="true" />
              {t("menu.theme.dark")}
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                theme === "light"
                  ? "bg-[#e8bc69]/15 text-[#e8bc69] border-[#e8bc69]/40"
                  : "border-[#334155] bg-[#0F172A] text-[#A0ABC0] hover:border-[#e8bc69]/40 hover:text-white"
              }`}
            >
              <Sun size={16} aria-hidden="true" />
              {t("menu.theme.light")}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
