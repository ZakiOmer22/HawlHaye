"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

const PROTECTED_PAGES = [
  "/board",
  "/my-tasks",
  "/delegations",
  "/review",
  "/dashboard",
  "/reports",
];

export function RouteGuard({
  user,
  children,
}: {
  user: { role: string; permissions?: Record<string, boolean> };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (user.role === "ADMINISTRATOR") {
    return <>{children}</>;
  }

  const matchedPage = PROTECTED_PAGES.find(
    (page) => pathname === page || pathname.startsWith(page + "/"),
  );

  if (matchedPage) {
    const hasAccess = user.permissions?.[matchedPage] === true;

    if (!hasAccess) {
      return (
        <div className="flex h-[70vh] flex-col items-center justify-center px-4 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="rounded-full bg-red-500/10 p-6 mb-6">
            <ShieldAlert className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-primary mb-2">Access Denied</h1>
          <p className="text-secondary max-w-md mb-8">
            Your role does not have permission to view this page. If you believe this is an error,
            please contact your system administrator.
          </p>
          <Link
            href="/board"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-text hover:bg-accent-hover transition shadow-sm"
          >
            Return to Board
          </Link>
        </div>
      );
    }
  }

  return <>{children}</>;
}
