"use client";

import { useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useOnline } from "@/lib/use-online";

export function OfflineBanner() {
  const online = useOnline();
  const [retrying, setRetrying] = useState(false);

  if (online) return null;

  function handleRetry() {
    setRetrying(true);
    // Give the spinner a moment to register visually, then hard reload
    setTimeout(() => window.location.reload(), 400);
  }

  return (
    <div className="sticky top-0 z-[120] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex items-center justify-between gap-4 border-b border-red-900/60 bg-gradient-to-r from-red-600 via-red-600 to-red-700 px-4 py-3 text-white shadow-lg shadow-red-900/40">
        <div className="flex min-w-0 items-center gap-3">
          {/* Pulsing icon with frosted backdrop */}
          <div className="relative shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm">
              <WifiOff size={16} className="text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight">You are offline</p>
            <p className="truncate text-xs font-medium text-red-100/90">
              Showing cached data · Changes will not be saved until you reconnect
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-60"
        >
          <RefreshCw size={12} className={retrying ? "animate-spin" : ""} />
          {retrying ? "Reconnecting…" : "Retry"}
        </button>
      </div>
    </div>
  );
}
