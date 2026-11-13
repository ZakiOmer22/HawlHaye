"use client";

import { useState } from "react";
import { RefreshCw, ShieldCheck, Lock, ServerCrash } from "lucide-react";

interface MaintenanceScreenProps {
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    universityName?: string;
  } | null;
  onRetry?: () => void; // Made optional so it NEVER crashes
}

export function MaintenanceScreen({ branding, onRetry }: MaintenanceScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const logo = branding?.logoUrl || "/icon.png";
  const uniName = branding?.universityName || "University of Hargeisa";
  const primaryColor = branding?.primaryColor || "#e8bc69";

  const handleRetryClick = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload(); // Fallback if no provider passed
      }
      setIsRetrying(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-app overflow-hidden">
      {/* NEW DESIGN: Subtle Grid Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Decorative Glow using the Brand Color */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        {/* Massive Branding Area */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div
              className="absolute inset-0 blur-2xl opacity-20"
              style={{ backgroundColor: primaryColor }}
            />
            <img
              src={logo}
              alt={uniName}
              className="relative h-28 w-28 sm:h-32 sm:w-32 object-contain rounded-3xl bg-white p-3 shadow-2xl border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAydjIwIj48cGF0aCBkPSJNMTcuOTcxIDYuMDE0YTEwIDEwIDAgMCAwLTExLjk0MiAwIj48L3N2Zz4=";
              }}
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-primary">
              HAWLHAYE
            </h1>
            <p
              className="text-sm sm:text-base font-bold uppercase tracking-[0.3em]"
              style={{ color: primaryColor }}
            >
              {uniName}
            </p>
          </div>
        </div>

        {/* The Glassmorphic Action Card */}
        <div className="w-full rounded-3xl border border-border bg-panel/60 backdrop-blur-xl shadow-2xl p-8 sm:p-12 space-y-6 mt-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <ServerCrash className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              System Under Maintenance
            </h2>
            <p className="text-sm sm:text-base text-secondary leading-relaxed max-w-md mx-auto">
              The HAWLHAYE platform is currently undergoing scheduled upgrades. We apologize for the
              inconvenience and appreciate your patience.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <button
              onClick={handleRetryClick}
              disabled={isRetrying}
              className="inline-flex w-full sm:w-auto min-w-[240px] items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-[#111] transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50 disabled:pointer-events-none"
              style={{ backgroundColor: primaryColor }}
            >
              <RefreshCw size={18} className={isRetrying ? "animate-spin" : ""} />
              {isRetrying ? "Checking Status..." : "Check Status Now"}
            </button>

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted mt-2">
              <Lock size={12} />
              Administrators retain full access
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-widest">
          <ShieldCheck size={14} /> Secured by HAWLHAYE &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
