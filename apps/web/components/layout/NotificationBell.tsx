"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Inbox } from "lucide-react";
import { useRealtime } from "@/lib/realtime";

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          markAllRead();
        }}
        className="relative p-2 text-[#CBD5E1] hover:text-white rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69]"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[#0F172A]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[#334155] bg-[#1E293B] shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#334155] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94A3B8]">
                <Inbox className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No new notifications
              </div>
            ) : (
              <div className="divide-y divide-[#334155]">
                {notifications.map((n, i) => (
                  <Link
                    key={i}
                    href={n.link || "#"}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 hover:bg-[#0F172A] transition"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-[#e8bc69] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-white">{n.title}</p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
