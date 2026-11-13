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
  Mail,
  Send,
  Loader2,
  Phone,
  Building,
  MessageSquare,
  CheckCircle2,
  Ticket,
  Settings2,
  Activity,
  CreditCard,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { OfflineBanner } from "./OfflineBanner";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";
import { TwoFABanner } from "./TwoFABanner";
import { SpotlightTour } from "./SpotlightTour";
import { TourConfetti } from "./TourConfetti";
import { Modal } from "@/components/ui/Modal";

// ── Extended User Type to include the new settings data ──
type AppUser = User & {
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    universityName?: string | null;
  };
  permissions?: Record<string, boolean>;
  impersonatedBy?: { id: string; fullName: string } | null;
};

type NavItem = {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  roles: string[];
};

// Create a typed version of Logo to avoid using 'any' for the new props
const ExtendedLogo = Logo as React.ComponentType<
  React.ComponentProps<typeof Logo> & { logoUrl?: string; appName?: string }
>;

const ACADEMIC_NAV: NavItem[] = [
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
];

const SYSADMIN_DIRECT_NAV = [
  { href: "/admin/system", label: "System Health", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
];

const MANAGEMENT_NAV = [
  { href: "/admin/offices", label: "Offices", icon: Building2 },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

const ROLE_LABEL: Record<string, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "232, 188, 105";
}

export function AppShell({
  user: initialUser,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  return (
    <PreferencesProvider>
      <RealtimeProvider>
        <ShellInner initialUser={initialUser}>{children}</ShellInner>
      </RealtimeProvider>
    </PreferencesProvider>
  );
}

function ShellInner({
  initialUser,
  children,
}: {
  initialUser: AppUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, theme, setLanguage, setTheme, t } = usePreferences();

  const [user, setUser] = useState<AppUser>(initialUser);
  const branding = user.branding || {};
  const primaryColor = branding.primaryColor || "#e8bc69";
  const uniName = branding.universityName || "University of Hargeisa";
  const logoUrl = branding.logoUrl || "/uoh.png";
  const userPermissions = user.permissions || {};
  const accentRgb = hexToRgb(primaryColor);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [academicMenuOpen, setAcademicMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [impersonation, setImpersonation] = useState<{ id: string; fullName: string } | null>(null);
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const academicMenuRef = useRef<HTMLDivElement>(null);

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactInquiry, setContactInquiry] = useState("Software License / Pricing");
  const [contactMessage, setContactMessage] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const allowedAcademicNav = ACADEMIC_NAV.filter((item) => {
    if (user.role === "ADMINISTRATOR") return true;
    if (Object.keys(userPermissions).length > 0) {
      return userPermissions[item.href] === true;
    }
    return item.roles.includes("ALL") || item.roles.includes(user.role);
  });

  const isSysAdmin = user.role === "ADMINISTRATOR";
  const isAdminRole = ["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(user.role);
  const mobileDock: NavItem[] = isSysAdmin
    ? [
        { href: "/dashboard", labelKey: "nav.dashboard", icon: Gauge, roles: ["ALL"] },
        { href: "/admin/users", labelKey: "nav.users", icon: Users, roles: ["ALL"] },
        { href: "/support", labelKey: "menu.support", icon: Ticket, roles: ["ALL"] },
      ]
    : ([
        allowedAcademicNav.find((n) => n.href === "/board"),
        allowedAcademicNav.find((n) => n.href === "/my-tasks"),
        allowedAcademicNav.find((n) => n.href === "/review") ||
          allowedAcademicNav.find((n) => n.href === "/delegations"),
      ].filter(Boolean) as NavItem[]);

  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const initial = user.fullName.charAt(0).toUpperCase();

  useEffect(() => {
    const syncUser = async () => {
      try {
        const res = await api<{ data: AppUser }>("/auth/me");
        if (res.data) {
          setUser(res.data);
          setImpersonation(res.data.impersonatedBy ?? null);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("focus", syncUser);
    const interval = setInterval(syncUser, 30000);
    return () => {
      window.removeEventListener("focus", syncUser);
      clearInterval(interval);
    };
  }, []);

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
      /* ignore */
    }
    window.location.replace(`/admin/users?_r=${Date.now()}`);
  }

  async function submitContactForm(e: React.FormEvent) {
    e.preventDefault();
    setContactBusy(true);
    try {
      await api("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: user.fullName,
          email: user.email,
          phone: contactPhone,
          company: contactCompany,
          inquiryType: contactInquiry,
          message: contactMessage,
        }),
      });
      setContactSuccess(true);
      setTimeout(() => {
        setIsContactOpen(false);
        setContactSuccess(false);
        setContactPhone("");
        setContactCompany("");
        setContactMessage("");
      }, 4000);
    } catch {
      setContactSuccess(true);
      setTimeout(() => {
        setIsContactOpen(false);
        setContactSuccess(false);
      }, 4000);
    } finally {
      setContactBusy(false);
    }
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
    if (!userMenuOpen && !adminMenuOpen && !academicMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node))
        setAdminMenuOpen(false);
      if (academicMenuRef.current && !academicMenuRef.current.contains(e.target as Node))
        setAcademicMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setAdminMenuOpen(false);
        setAcademicMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen, adminMenuOpen, academicMenuOpen]);

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
    <div
      className="flex min-h-screen flex-col bg-app text-primary"
      style={{ "--accent": primaryColor, "--accent-rgb": accentRgb } as React.CSSProperties}
    >
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
            onClick={stopImpersonation}
            disabled={stoppingImpersonation}
            className="shrink-0 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-bold text-amber-500 hover:bg-[#1E293B] transition disabled:opacity-50"
          >
            {stoppingImpersonation ? "Returning…" : "Return to Admin"}
          </button>
        </div>
      )}

      <div
        data-force-dark
        className="bg-gradient-to-r from-[#0A101F] via-[#0F172A] to-[#0A101F] border-b border-[#1E293B] px-4 py-3 sm:px-6 flex items-center justify-between gap-4 z-[101] relative shadow-md"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="relative group flex-shrink-0">
            <div
              className="absolute inset-0 blur-md opacity-0 group-hover:opacity-40 transition-opacity rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <img
              src={logoUrl}
              alt={uniName}
              className="relative h-8 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          </div>
          <div className="hidden text-[var(--accent)] font-black text-xl tracking-wider">UOH</div>
          <div className="flex flex-col border-l border-[#334155] pl-3 sm:pl-4 min-w-0">
            <span className="text-sm sm:text-base font-black text-white tracking-wide truncate drop-shadow-sm">
              {uniName}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--accent)] mt-0.5">
              Institution Portal
            </span>
          </div>
        </div>

        {isSysAdmin && (
          <button
            onClick={() => setIsContactOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[#f1cf8b] px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#0F172A] shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)] transition-all hover:-translate-y-0.5 flex-shrink-0"
          >
            <Mail size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Contact Sales</span>
            <span className="sm:hidden">Sales</span>
          </button>
        )}
      </div>

      <header
        data-force-dark
        className="sticky top-0 z-[100] shrink-0 border-b border-[#334155] bg-[#0F172A]/95 backdrop-blur-xl shadow-md shadow-black/20"
      >
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 text-[#CBD5E1] hover:text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Menu size={24} aria-hidden="true" />
            </button>
            <ExtendedLogo
              size="md"
              href={isSysAdmin ? "/admin/users" : "/board"}
              logoUrl={logoUrl}
              appName={uniName}
            />
          </div>

          <nav
            data-tour="navbar"
            className="hidden md:flex items-center gap-1.5"
            aria-label="Main navigation"
          >
            {isSysAdmin ? (
              <>
                <div className="relative" ref={academicMenuRef}>
                  <button
                    onClick={() => {
                      setAcademicMenuOpen(!academicMenuOpen);
                      setAdminMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${allowedAcademicNav.some((a) => isActive(a.href)) ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.3)]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"}`}
                  >
                    <LayoutGrid size={16} /> Academic{" "}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${academicMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {academicMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-xl border border-[#334155] bg-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                      <div className="p-2 space-y-1">
                        {allowedAcademicNav.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setAcademicMenuOpen(false)}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white"}`}
                            >
                              <Icon size={16} /> {t(item.labelKey)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {SYSADMIN_DIRECT_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${active ? "bg-[var(--accent)] text-[#0F172A] shadow-[0_0_15px_rgba(var(--accent-rgb),0.35)]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"}`}
                    >
                      <Icon size={16} /> {item.label}
                    </Link>
                  );
                })}

                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => {
                      setAdminMenuOpen(!adminMenuOpen);
                      setAcademicMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${MANAGEMENT_NAV.some((a) => isActive(a.href)) ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.3)]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"}`}
                  >
                    <Settings2 size={16} /> Management{" "}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${adminMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {adminMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-xl border border-[#334155] bg-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                      <div className="p-2 space-y-1">
                        {MANAGEMENT_NAV.map((link) => {
                          const Icon = link.icon;
                          const active = isActive(link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setAdminMenuOpen(false)}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white"}`}
                            >
                              <Icon size={16} /> {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  href="/support"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${isActive("/support") ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"}`}
                >
                  <Ticket size={16} /> Support
                </Link>
              </>
            ) : (
              <>
                {allowedAcademicNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${active ? "bg-[var(--accent)] text-[#0F172A] shadow-[0_0_15px_rgba(var(--accent-rgb),0.35)]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"}`}
                    >
                      <Icon size={16} aria-hidden="true" /> {t(item.labelKey)}
                    </Link>
                  );
                })}

                {isAdminRole && (
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${[...MANAGEMENT_NAV, { href: "/admin/users", label: "Users", icon: Users }].some((a) => isActive(a.href)) ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.3)]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"}`}
                    >
                      <Settings2 size={16} /> Management{" "}
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${adminMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {adminMenuOpen && (
                      <div className="absolute left-0 mt-2 w-56 rounded-xl border border-[#334155] bg-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                        <div className="p-2 space-y-1">
                          {[
                            { href: "/admin/users", label: "Users", icon: Users },
                            ...MANAGEMENT_NAV,
                          ].map((link) => {
                            const Icon = link.icon;
                            const active = isActive(link.href);
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setAdminMenuOpen(false)}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${active ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white"}`}
                              >
                                <Icon size={16} /> {link.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Link
                  href="/support"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${isActive("/support") ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border border-transparent"}`}
                >
                  <Ticket size={16} /> Support
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-white hover:border-[#475569] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Search size={14} /> <span>Search...</span>{" "}
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
                className="flex items-center gap-2 rounded-full pl-1 pr-2 rtl:pl-2 rtl:pr-1 py-1 hover:bg-[#1E293B] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#334155] text-sm font-black text-[var(--accent)] shadow-sm"
                >
                  {initial}
                </span>
                <span className="hidden sm:block text-left rtl:text-right">
                  <span className="block text-xs font-bold text-white leading-tight">
                    {user.fullName}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] leading-tight">
                    {roleLabel}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={`hidden sm:block text-[#CBD5E1] transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-72 rounded-xl border border-[#334155] bg-[#1E293B] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-50"
                >
                  <div className="px-4 py-3 border-b border-[#334155]">
                    <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] mt-0.5">
                      {roleLabel}
                    </p>
                    <p className="text-[11px] text-[#CBD5E1] mt-1 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition"
                    >
                      <UserCircle2 size={14} /> {t("menu.profile")}
                    </Link>
                    <Link
                      href="/profile/security"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition"
                    >
                      <ShieldCheck size={14} /> {t("security.2fa.title")}
                    </Link>
                    <Link
                      href="/change-password"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition"
                    >
                      <KeyRound size={14} /> {t("menu.changePassword")}
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition"
                    >
                      <Ticket size={14} /> {t("menu.support") || "Support"}
                    </Link>
                    <Link
                      href="/help"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white transition"
                    >
                      <HelpCircle size={14} /> {t("menu.help")}
                    </Link>
                  </div>

                  <div className="border-t border-[#334155] px-4 py-3">
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#CBD5E1]">
                      <Globe size={12} /> {t("menu.language")}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => setLanguage(l.code)}
                          className={`rounded-lg px-2 py-1.5 text-xs font-bold transition ${language === l.code ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.4)]" : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white border border-transparent"}`}
                        >
                          {l.native}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#334155] px-4 py-3">
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#CBD5E1]">
                      {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />} {t("menu.theme")}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${theme === "dark" ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.4)]" : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white border border-transparent"}`}
                      >
                        <Moon size={12} /> {t("menu.theme.dark")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${theme === "light" ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.4)]" : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white border border-transparent"}`}
                      >
                        <Sun size={12} /> {t("menu.theme.light")}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#334155] py-1">
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10 transition"
                    >
                      <LogOut size={14} /> {t("menu.signOut")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <Modal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        title="Contact HAWLHAYE Sales"
        description="Interested in a full SaaS license for your institution? Send us a message and our team will reach out."
      >
        {contactSuccess ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Message Sent Successfully!</h3>
            <p className="text-sm text-[#94A3B8] max-w-sm mx-auto">
              Thank you for your interest. A member of our sales team will get back to you within 24
              hours.
            </p>
          </div>
        ) : (
          <form onSubmit={submitContactForm} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Full Name
                </label>
                <div className="relative">
                  <UserCircle2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    disabled
                    value={user.fullName}
                    className="w-full rounded-xl border border-border bg-app/50 py-2.5 ps-10 pe-4 text-sm text-secondary cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-border bg-app/50 py-2.5 ps-10 pe-4 text-sm text-secondary cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    required
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+252 63 000 0000"
                    className="w-full rounded-xl border border-border bg-app py-2.5 ps-10 pe-4 text-sm text-primary placeholder-muted outline-none transition focus:border-accent"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Organization
                </label>
                <div className="relative">
                  <Building className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    required
                    type="text"
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder="e.g. University of Hargeisa"
                    className="w-full rounded-xl border border-border bg-app py-2.5 ps-10 pe-4 text-sm text-primary placeholder-muted outline-none transition focus:border-accent"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Inquiry Type
              </label>
              <select
                value={contactInquiry}
                onChange={(e) => setContactInquiry(e.target.value)}
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
              >
                <option value="Software License / Pricing">Software License / Pricing</option>
                <option value="Request a Demo">Request a Live Demo</option>
                <option value="Custom Integration">Custom Integration / API Access</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                How can we help you?
              </label>
              <div className="relative">
                <MessageSquare className="absolute start-3 top-4 h-4 w-4 text-muted" />
                <textarea
                  required
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Tell us about your needs..."
                  className="w-full resize-none rounded-xl border border-border bg-app py-3 ps-10 pe-4 text-sm text-primary placeholder-muted outline-none transition focus:border-accent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <button
                type="button"
                onClick={() => setIsContactOpen(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-muted hover:text-primary transition"
              >
                Cancel
              </button>
              <button
                disabled={contactBusy || !contactMessage || !contactPhone || !contactCompany}
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-[#0F172A] transition hover:opacity-90 disabled:opacity-50"
              >
                {contactBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{" "}
                Send Message
              </button>
            </div>
          </form>
        )}
      </Modal>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            data-force-dark
            className="relative w-4/5 max-w-sm bg-[#0F172A] h-full shadow-2xl flex flex-col p-6 border-r border-[#334155] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <ExtendedLogo
                size="md"
                href={isSysAdmin ? "/admin/users" : "/board"}
                logoUrl={logoUrl}
                appName={uniName}
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#CBD5E1] hover:text-white rounded-lg p-2"
              >
                <X size={24} />
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="flex items-center gap-3 w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-base font-bold text-[#CBD5E1] hover:text-white transition mb-4"
            >
              <Search size={20} /> Search...
            </button>

            <nav className="flex-1 flex flex-col gap-1">
              {allowedAcademicNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold transition ${active ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}
                  >
                    <Icon size={20} /> {t(item.labelKey)}
                  </Link>
                );
              })}

              {isSysAdmin && (
                <div className="mt-4 pt-4 border-t border-[#334155]">
                  <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-2">
                    <Activity size={12} /> System Admin
                  </p>
                  {SYSADMIN_DIRECT_NAV.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold transition ${active ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}
                      >
                        <Icon size={20} /> {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {isAdminRole && (
                <div className="mt-4 pt-4 border-t border-[#334155]">
                  <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-2">
                    <Settings2 size={12} /> Management
                  </p>
                  {MANAGEMENT_NAV.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold transition ${active ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}
                      >
                        <Icon size={20} /> {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </nav>

            <div className="border-t border-[#334155] pt-4 mt-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                <p className="text-xs text-[var(--accent)] uppercase tracking-wider">{roleLabel}</p>
                <p className="text-[11px] text-[#CBD5E1] truncate">{user.email}</p>
              </div>

              {isSysAdmin && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsContactOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] px-3 py-2.5 text-sm font-bold text-[#0F172A] transition shadow-sm"
                >
                  <Mail size={16} /> Contact Sales
                </button>
              )}

              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-bold text-[#CBD5E1] hover:text-white transition"
              >
                <UserCircle2 size={16} /> {t("menu.profile")}
              </Link>
              <Link
                href="/profile/security"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-bold text-[#CBD5E1] hover:text-white transition"
              >
                <ShieldCheck size={16} /> {t("security.2fa.title")}
              </Link>
              <Link
                href="/change-password"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-bold text-[#CBD5E1] hover:text-white transition"
              >
                <KeyRound size={16} /> {t("menu.changePassword")}
              </Link>
              <Link
                href="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-bold text-[#CBD5E1] hover:text-white transition"
              >
                <Ticket size={16} /> {t("menu.support") || "Support"}
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
                      className={`rounded-lg px-2 py-1.5 text-xs font-bold transition ${language === l.code ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.4)]" : "border border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}
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
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${theme === "dark" ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.4)]" : "border border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}
                  >
                    <Moon size={12} /> {t("menu.theme.dark")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition ${theme === "light" ? "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.4)]" : "border border-[#334155] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}
                  >
                    <Sun size={12} /> {t("menu.theme.light")}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20 transition"
              >
                <LogOut size={16} /> {t("menu.signOut")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-1 rounded-full border border-[#334155] bg-[#0F172A] px-2 py-2 shadow-2xl md:hidden w-[92%] max-w-sm">
        {mobileDock.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-xl transition-colors ${active ? "bg-[var(--accent)] text-[#0F172A]" : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-bold truncate max-w-full px-1">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-xl text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white transition-colors"
        >
          <Menu size={20} />
          <span className="text-[10px] font-bold">Menu</span>
        </button>
      </div>

      <main className="flex-1 w-full px-4 py-6 pb-32 md:pb-6">{children}</main>
      <div className="shrink-0 lg:mb-0 md:mb-0 mb-12 flex items-center justify-center">
        <PoweredBy />
      </div>
      <CommandPalette open={searchOpen} setOpen={setSearchOpen} />
      <SpotlightTour />
      <TourConfetti />
    </div>
  );
}
