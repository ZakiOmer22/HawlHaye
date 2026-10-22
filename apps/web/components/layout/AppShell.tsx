"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Footer } from "./Footer";
import { Logo } from "../ui/Logo";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  CheckSquare,
  BarChart2,
  Users,
  HelpCircle,
  Tag,
  Building2,
} from "lucide-react";
import { useState } from "react";

// Define roles based on your Prisma schema
const NAV = [
  { href: "/board", label: "Board", icon: LayoutDashboard, roles: ["ALL"] },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare, roles: ["ALL"] },
  {
    href: "/review",
    label: "Review Queue",
    icon: CheckSquare,
    roles: ["DEAN", "DEPUTY", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: BarChart2,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart2,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },

  // Admin Dropdown / Section
  { href: "/admin/users", label: "Users", icon: Users, roles: ["DEAN", "DEPUTY", "ADMINISTRATOR"] },
  {
    href: "/admin/offices",
    label: "Offices",
    icon: Building2,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR"],
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: Tag,
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR"],
  },

  { href: "/help", label: "Help", icon: HelpCircle, roles: ["ALL"] },
];
export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors, just redirect to login
    }
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const allowedNav = NAV.filter(
    (item) => item.roles.includes("ALL") || item.roles.includes(user.role),
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0F172A] text-[#F8FAFC]">
      {/* HEADER */}
      <header className="sticky top-0 z-[100] border-b border-[#334155] bg-[#0F172A]/90 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#94A3B8] hover:text-white"
            >
              <Menu size={24} />
            </button>
            <Logo size="md" href="/board" />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                    isActive(item.href)
                      ? "bg-[#1E293B] text-white border border-[#334155]"
                      : "text-[#94A3B8] hover:bg-[#1E293B]/50 hover:text-white"
                  }`}
                >
                  <Icon size={16} /> {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-white">{user.fullName}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#e8bc69]">
                {user.role.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:border-red-500/50 hover:text-red-400"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-sm bg-[#0F172A] h-full shadow-2xl flex flex-col p-6 border-r border-[#334155]">
            <div className="flex items-center justify-between mb-8">
              <Logo size="md" href="/board" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 flex flex-col gap-2">
              {allowedNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-bold transition ${
                      isActive(item.href)
                        ? "bg-[#1E293B] text-white border border-[#334155]"
                        : "text-[#94A3B8] hover:bg-[#1E293B]/50 hover:text-white"
                    }`}
                  >
                    <Icon size={20} /> {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[#334155] pt-4 mt-4">
              <p className="text-sm font-bold text-white">{user.fullName}</p>
              <p className="text-xs text-[#e8bc69] uppercase tracking-wider">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full px-4 py-6 pb-24">{children}</main>
      <Footer />
    </div>
  );
}
