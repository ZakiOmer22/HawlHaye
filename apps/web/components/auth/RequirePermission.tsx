"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";

export function RequirePermission({ page, children }: { page: string; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await api<{ data: { role: string; permissions?: Record<string, boolean> } }>(
          "/auth/me",
        );
        const user = res.data;

        if (user.role === "ADMINISTRATOR") {
          setStatus("allowed");
          return;
        }

        const hasAccess = user.permissions?.[page] === true;

        if (hasAccess) {
          setStatus("allowed");
        } else {
          setStatus("denied");
        }
      } catch {
        router.push("/login");
      }
    }

    checkAccess();
  }, [page, router]);

  if (status === "loading") {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center px-4 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-full bg-red-500/10 p-6 mb-6">
          <ShieldAlert className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-primary mb-2">Access Denied</h1>
        <p className="text-secondary max-w-md mb-8">
          Your role does not have permission to view this page. If you believe this is an error,
          please contact your administrator.
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

  return <>{children}</>;
}
