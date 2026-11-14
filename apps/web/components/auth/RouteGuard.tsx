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
  "/admin/users",
  "/admin/offices",
  "/admin/categories",
  "/admin/audit",
  "/support",
];

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  DEAN: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": true,
    "/admin/users": true,
    "/admin/offices": true,
    "/admin/categories": true,
    "/admin/audit": true,
    "/support": true,
  },
  DEPUTY: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": true,
    "/admin/users": true,
    "/admin/offices": true,
    "/admin/categories": true,
    "/admin/audit": true,
    "/support": true,
  },
  FACULTY_COORDINATOR: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": false,
    "/admin/users": false,
    "/admin/offices": false,
    "/admin/categories": false,
    "/admin/audit": false,
    "/support": true,
  },
  LABS_COORDINATOR: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": false,
    "/admin/users": false,
    "/admin/offices": false,
    "/admin/categories": false,
    "/admin/audit": false,
    "/support": true,
  },
  LAB_TECHNICIAN: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": false,
    "/review": false,
    "/dashboard": false,
    "/reports": false,
    "/admin/users": false,
    "/admin/offices": false,
    "/admin/categories": false,
    "/admin/audit": false,
    "/support": true,
  },
};

export function RouteGuard({
  user,
  children,
}: {
  user: { role: string; permissions?: Record<string, boolean> };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // 1. ADMINISTRATORS BYPASS ALL CHECKS
  if (user.role === "ADMINISTRATOR") {
    return <>{children}</>;
  }

  // 2. HARDCODE SYSTEM SETTINGS AND SYSTEM HEALTH TO ADMIN ONLY
  if (pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/system")) {
    return <AccessDenied />;
  }

  // 3. CHECK MATRIX FOR EVERYTHING ELSE
  const matchedPage = PROTECTED_PAGES.find(
    (page) => pathname === page || pathname.startsWith(page + "/"),
  );

  if (matchedPage) {
    const dbPermissions = user.permissions || {};
    const defaultPermissions = DEFAULT_MATRIX[user.role] || {};

    // Merge: If DB is missing the key, fallback to default
    const hasAccess =
      dbPermissions[matchedPage] !== undefined
        ? dbPermissions[matchedPage]
        : defaultPermissions[matchedPage] || false;

    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}

function AccessDenied() {
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
