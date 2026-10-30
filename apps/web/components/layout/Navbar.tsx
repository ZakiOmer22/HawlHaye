"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "../ui/Logo";

const NAV_ITEMS = [
  { href: "#features", label: "Features" },
  { href: "#process", label: "Process" },
  { href: "#showcase", label: "Showcase" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock scroll + Escape closes when the mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-[100] w-full border-b border-border bg-app/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo size="md" href="/" />

          <nav
            className="hidden items-center gap-8 text-sm font-semibold text-muted md:flex"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded px-1 py-0.5 transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl px-4 py-2 text-sm font-bold text-primary transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-text shadow-[0_0_20px_rgba(232,188,105,0.2)] transition hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_0_30px_rgba(232,188,105,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app"
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-[200] flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative ml-auto flex h-full w-4/5 max-w-sm flex-col overflow-y-auto border-l border-border bg-app p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <Logo size="md" href="/" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={24} aria-hidden="true" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center rounded-xl px-4 py-3 text-base font-bold text-muted transition hover:bg-panel hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-xl border border-border bg-panel px-3 py-2 text-sm font-bold text-primary transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-text transition hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
