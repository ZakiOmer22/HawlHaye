"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { PoweredBy } from "./PoweredBy";
import { Logo } from "../ui/Logo";
import { PreferencesProvider, usePreferences } from "@/lib/preferences";
import { RealtimeProvider } from "@/lib/realtime";
import { LANGUAGES, type TranslationKey } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";
import {
  LogOut,
  Menu,
  X,
  LayoutGrid,
  CheckSquare,
  ClipboardCheck,
  Gauge,
  BarChart3,
  Users,
  HelpCircle,
  Tag,
  Building2,
  KeyRound,
  ChevronDown,
  UserCircle2,
  Sun,
  Moon,
  Globe,
  Search,
  Inbox,
  ShieldCheck,
  ShieldAlert,
  ScrollText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { OfflineBanner } from "./OfflineBanner";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";
import { TwoFABanner } from "./TwoFABanner";
import { SpotlightTour } from "./SpotlightTour";
import { TourConfetti } from "./TourConfetti";

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  roles: string[];
};

const NAV: NavItem[] = [
  { href: "/board", labelKey: "nav.board", icon: LayoutGrid, roles: ["ALL"] },
  { href: "/my-tasks", labelKey: "nav.myTasks", icon: CheckSquare, roles: ["ALL"] },
  { href: "/delegations", labelKey: "nav.delegations", icon: Inbox, roles: ["ALL"] },
  {
    href: "/review",
    labelKey: "nav.review",
    icon: ClipboardCheck,
    roles: ["DEAN", "DEPUTY", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },
  {
    href: "/dashboard",
    labelKey: "nav.dashboard",
    icon: Gauge,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },
  {
    href: "/reports",
    labelKey: "nav.reports",
    icon: BarChart3,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },
  {
    href: "/admin/users",
    labelKey: "nav.users",
    icon: Users,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR"],
  },
  {
    href: "/admin/offices",
    labelKey: "nav.offices",
    icon: Building2,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR"],
  },
  {
    href: "/admin/categories",
    labelKey: "nav.categories",
    icon: Tag,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR"],
  },
  {
    href: "/admin/audit",
    labelKey: "nav.audit",
    icon: ScrollText,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR"],
  },
  { href: "/help", labelKey: "nav.help", icon: HelpCircle, roles: ["ALL"] },
];

const ROLE_LABEL: Record<string, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <RealtimeProvider>
        <ShellInner user={user}>{children}</ShellInner>
      </RealtimeProvider>
    </PreferencesProvider>
  );
}

function ShellInner({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, theme, setLanguage, setTheme, t } = usePreferences();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<{ id: string; fullName: string } | null>(null);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const allowedNav = NAV.filter(
    (item) => item.roles.includes("ALL") || item.roles.includes(user.role),
  );
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const initial = user.fullName.charAt(0).toUpperCase();

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  }

  async function stopImpersonation() {
    setStoppingImpersonation(true);
    setImpersonation(null);
    try {
      await api("/auth/impersonation/stop", { method: "POST" });
    } catch {
      /* ignore — redirect anyway */
    }
    window.location.replace(`/admin/users?_r=${Date.now()}`);
  }

  useEffect(() => {
    const openMenu = () => setUserMenuOpen(true);
    const closeMenu = () => setUserMenuOpen(false);
    window.addEventListener("tour-open-profile", openMenu);
    window.addEventListener("tour-close-profile", closeMenu);
    return () => {
      window.removeEventListener("tour-open-profile", openMenu);
      window.removeEventListener("tour-close-profile", closeMenu);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ data: { impersonatedBy?: { id: string; fullName: string } | null } }>("/auth/me")
      .then((res) => {
        if (!cancelled) setImpersonation(res.data.impersonatedBy ?? null);
      })
      .catch(() => {
        if (!cancelled) setImpersonation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const refetch = () => {
      api<{ data: { impersonatedBy?: { id: string; fullName: string } | null } }>("/auth/me")
        .then((res) => setImpersonation(res.data.impersonatedBy ?? null))
        .catch(() => setImpersonation(null));
    };

    const onFocus = () => refetch();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-app text-primary">
      <ServiceWorkerRegistrar />
      <OfflineBanner />

      <div data-tour="2fa-banner">
        <TwoFABanner />
      </div>

      {impersonation && (
        <div className="sticky top-0 z-[110] flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-[#0F172A] shadow-lg">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <ShieldAlert size={16} className="shrink-0" />
            <span className="truncate">
              Impersonating <strong>{user.fullName}</strong> · Admin: {impersonation.fullName}
            </span>
          </div>
          <button
            type="button"
            onClick={stopImpersonation}
            disabled={stoppingImpersonation}
            className="shrink-0 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-bold text-amber-500 hover:bg-[#1E293B] transition disabled:opacity-50"
          >
            {stoppingImpersonation ? "Returning…" : "Return to Admin"}
          </button>
        </div>
      )}

      <header
        data-force-dark
        className="sticky top-0 z-[100] shrink-0 border-b border-[#334155] bg-[#0F172A]/90 backdrop-blur-xl"
      >
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 text-[#CBD5E1] hover:text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
            >
              <Menu size={24} aria-hidden="true" />
            </button>
            <Logo size="md" href="/board" />
          </div>

          <nav
            data-tour="navbar"
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={`nav-${item.href.slice(1).replace(/\//g, "-")}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                    active
                      ? "bg-[#e8bc69] text-[#0F172A] shadow-[0_0_15px_rgba(232,188,105,0.35)]"
                      : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" /> {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-white hover:border-[#475569] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
            >
              <Search size={14} />
              <span>Search...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-[#334155] bg-[#0F172A] px-1.5 font-mono text-[10px] font-bold">
                ⌘K
              </kbd>
            </button>

            <NotificationBell />

            <div className="relative" ref={userMenuRef}>
              <button
                data-tour="profile-menu"
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 rtl:pl-2 rtl:pr-1 py-1 hover:bg-[#1E293B] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E293B] border border-[#334155] text-sm font-black text-white"
                >
                  {initial}
                </span>
                <span className="hidden sm:block text-left rtl:text-right">
                  <span className="block text-xs font-bold text-white leading-tight">
                    {user.fullName}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-[#e8bc69] leading-tight">
                    {roleLabel}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={`hidden sm:block text-[#CBD5E1] transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-72 rounded-xl border border-[#334155] bg-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="px-4 py-3 border-b border-[#334155]">
                    <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#e8bc69] mt-0.5">
                      {roleLabel}
                    </p>
                    <p className="text-[11px] text-[#CBD5E1] mt-1 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition focus:outline-none focus-visible:bg-[#0F172A]"
                    >
                      <UserCircle2 size={14} aria-hidden="true" />
                      {t("menu.profile")}
                    </Link>
                    <Link
                      href="/profile/security"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition focus:outline-none focus-visible:bg-[#0F172A]"
                    >
                      <ShieldCheck size={14} aria-hidden="true" />
                      {t("security.2fa.title")}
                    </Link>
                    <Link
                      href="/change-password"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition focus:outline-none focus-visible:bg-[#0F172A]"
                    >
                      <KeyRound size={14} aria-hidden="true" />
                      {t("menu.changePassword")}
                    </Link>
                    <Link
                      href="/help"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition focus:outline-none focus-visible:bg-[#0F172A]"
                    >
                      <HelpCircle size={14} aria-hidden="true" />
                      {t("menu.help")}
                    </Link>
                  </div>

                  <div className="border-t border-[#334155] px-4 py-3">
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#CBD5E1]">
                      <Globe size={12} aria-hidden="true" />
                      {t("menu.language")}
                    </div>
                    <div
                      className="grid grid-cols-3 gap-1"
                      role="group"
                      aria-label={t("menu.language")}
                    >
                      {LANGUAGES.map((l) => {
                        const selected = language === l.code;
                        return (
                          <button
                            key={l.code}
                            type="button"
                            role="menuitemradio"
                            aria-checked={selected}
                            onClick={() => setLanguage(l.code)}
                            className={`rounded-lg px-2 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                              selected
                                ? "bg-[#e8bc69]/15 text-[#e8bc69] border border-[#e8bc69]/40"
                                : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white border border-transparent"
                            }`}
                          >
                            {l.native}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[#334155] px-4 py-3">
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#CBD5E1]">
                      {theme === "dark" ? (
                        <Moon size={12} aria-hidden="true" />
                      ) : (
                        <Sun size={12} aria-hidden="true" />
                      )}
                      {t("menu.theme")}
                    </div>
                    <div
                      className="grid grid-cols-2 gap-1"
                      role="group"
                      aria-label={t("menu.theme")}
                    >
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={theme === "dark"}
                        onClick={() => setTheme("dark")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                          theme === "dark"
                            ? "bg-[#e8bc69]/15 text-[#e8bc69] border border-[#e8bc69]/40"
                            : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white border border-transparent"
                        }`}
                      >
                        <Moon size={12} aria-hidden="true" />
                        {t("menu.theme.dark")}
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={theme === "light"}
                        onClick={() => setTheme("light")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                          theme === "light"
                            ? "bg-[#e8bc69]/15 text-[#e8bc69] border border-[#e8bc69]/40"
                            : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white border border-transparent"
                        }`}
                      >
                        <Sun size={12} aria-hidden="true" />
                        {t("menu.theme.light")}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#334155] py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10 transition focus:outline-none focus-visible:bg-red-500/10"
                    >
                      <LogOut size={14} aria-hidden="true" />
                      {t("menu.signOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[200] flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            data-force-dark
            className="relative w-4/5 max-w-sm bg-[#0F172A] h-full shadow-2xl flex flex-col p-6 border-r rtl:border-r-0 rtl:border-l border-[#334155] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <Logo size="md" href="/board" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="text-[#CBD5E1] hover:text-white rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="flex items-center gap-3 w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-base font-bold text-[#CBD5E1] hover:text-white transition mb-4"
            >
              <Search size={20} />
              Search...
            </button>

            <nav className="flex-1 flex flex-col gap-1" aria-label="Main navigation">
              {allowedNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] ${
                      active
                        ? "bg-[#e8bc69] text-[#0F172A] shadow-[0_0_15px_rgba(232,188,105,0.35)]"
                        : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon size={20} aria-hidden="true" /> {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[#334155] pt-4 mt-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                <p className="text-xs text-[#e8bc69] uppercase tracking-wider">{roleLabel}</p>
                <p className="text-[11px] text-[#CBD5E1] truncate">{user.email}</p>
              </div>

              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-bold text-[#CBD5E1] hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
              >
                <UserCircle2 size={16} aria-hidden="true" /> {t("menu.profile")}
              </Link>
              <Link
                href="/profile/security"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-bold text-[#CBD5E1] hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
              >
                <ShieldCheck size={16} aria-hidden="true" /> {t("security.2fa.title")}
              </Link>
              <Link
                href="/change-password"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-bold text-[#CBD5E1] hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
              >
                <KeyRound size={16} aria-hidden="true" /> {t("menu.changePassword")}
              </Link>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#CBD5E1] mb-1.5">
                  {t("menu.language")}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={`rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                        language === l.code
                          ? "bg-[#e8bc69]/15 text-[#e8bc69] border border-[#e8bc69]/40"
                          : "border border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                      }`}
                    >
                      {l.native}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#CBD5E1] mb-1.5">
                  {t("menu.theme")}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                      theme === "dark"
                        ? "bg-[#e8bc69]/15 text-[#e8bc69] border border-[#e8bc69]/40"
                        : "border border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                    }`}
                  >
                    <Moon size={12} aria-hidden="true" /> {t("menu.theme.dark")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                      theme === "light"
                        ? "bg-[#e8bc69]/15 text-[#e8bc69] border border-[#e8bc69]/40"
                        : "border border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                    }`}
                  >
                    <Sun size={12} aria-hidden="true" /> {t("menu.theme.light")}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <LogOut size={16} aria-hidden="true" /> {t("menu.signOut")}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full px-4 py-6 pb-24">{children}</main>
      <div className="shrink-0">
        <PoweredBy />
      </div>

      <CommandPalette open={searchOpen} setOpen={setSearchOpen} />
      <SpotlightTour />
      <TourConfetti />
    </div>
  );
}
