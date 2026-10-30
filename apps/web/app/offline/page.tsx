"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  function reload() {
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-6 text-center text-white font-sans">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#334155] bg-[#1E293B] shadow-xl shadow-black/30">
          <WifiOff className="h-10 w-10 text-[#e8bc69]" />
        </div>
        <h1 className="mb-3 text-2xl font-black text-white">You are offline</h1>
        <p className="mb-6 text-sm leading-relaxed text-[#94A3B8]">
          HAWLHAYE cannot reach the server right now. If you previously visited this page, try going
          back or use the reload button below once your connection returns.
        </p>
        <button
          onClick={reload}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-6 py-3 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b]"
        >
          <RefreshCw size={16} /> Try again
        </button>
        <p className="mt-8 text-xs text-[#64748B]">HAWLHAYE — University of Hargeisa / CECIT</p>
      </div>
    </div>
  );
}
