"use client";

import Link from "next/link";
import { ShieldAlert, ShieldCheck, ChevronRight } from "lucide-react";
import { useTwoFAStatus } from "@/lib/use-two-fa-status";

export function TwoFABanner() {
  const { status } = useTwoFAStatus();

  if (!status) return null;
  if (status.enforcement === "n/a" || status.enforcement === "active") return null;

  const isBlocked = status.enforcement === "blocked";

  return (
    <div
      className={`sticky top-0 z-[115] animate-in slide-in-from-top-2 fade-in duration-300 ${
        isBlocked
          ? "bg-gradient-to-r from-red-600 via-red-600 to-red-700"
          : "bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600"
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white shadow-lg">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/25" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm">
              {isBlocked ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight">
              {isBlocked
                ? "2FA is now required"
                : `Enable 2FA within ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"}`}
            </p>
            <p className="truncate text-xs font-medium opacity-90">
              {isBlocked
                ? "High-risk actions (invite, deactivate, delete, impersonate) are blocked until you enable two-factor authentication."
                : "Your leadership role requires two-factor authentication. Enable it before the grace period ends to avoid disruption."}
            </p>
          </div>
        </div>
        <Link
          href="/profile/security"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Enable 2FA <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
