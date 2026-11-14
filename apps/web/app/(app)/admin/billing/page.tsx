"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/preferences";
import {
  CreditCard,
  CheckCircle2,
  Users,
  Building2,
  Tag,
  Sparkles,
  Mail,
  AlertCircle,
} from "lucide-react";

type Usage = { users: number; offices: number; categories: number };

export default function AdminBillingPage() {
  const { t } = usePreferences();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const safe = async <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

      const [usersRes, officesRes, categoriesRes] = await Promise.all([
        safe(api<{ data: unknown[] }>("/users")),
        safe(api<{ data: unknown[] }>("/offices?includeInactive=true")),
        safe(api<{ data: unknown[] }>("/categories?includeInactive=true")),
      ]);

      if (cancelled) return;

      if (!usersRes || !officesRes || !categoriesRes) {
        setUsageError(t("admin.billing.usage.error"));
      }

      setUsage({
        users: usersRes?.data.length ?? 0,
        offices: officesRes?.data.length ?? 0,
        categories: categoriesRes?.data.length ?? 0,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const stat = (value: number | null) =>
    value === null ? "—" : new Intl.NumberFormat().format(value);

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            {t("nav.billing")}
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{t("admin.billing.title")}</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">{t("admin.billing.subtitle")}</p>
        </div>
      </header>

      {usageError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400"
        >
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <p>{usageError}</p>
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="text-[#e8bc69]" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.billing.stats.plan")}
            </p>
          </div>
          <p className="text-xl font-black text-white truncate">
            {t("admin.billing.plan.selfHosted")}
          </p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-emerald-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.billing.stats.users")}
            </p>
          </div>
          <p className="text-xl font-black text-emerald-400">{stat(usage?.users ?? null)}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="text-blue-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.billing.stats.offices")}
            </p>
          </div>
          <p className="text-xl font-black text-blue-400">{stat(usage?.offices ?? null)}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="text-violet-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.billing.stats.categories")}
            </p>
          </div>
          <p className="text-xl font-black text-violet-400">{stat(usage?.categories ?? null)}</p>
        </div>
      </section>

      <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden">
        <div className="p-6 border-b border-[#334155] flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 rounded-xl border border-[#e8bc69]/20 bg-[#e8bc69]/10 shrink-0">
            <Sparkles className="text-[#e8bc69]" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white">
              {t("admin.billing.currentPlan.title")}
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">{t("admin.billing.currentPlan.desc")}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t("admin.billing.currentPlan.active")}
          </span>
        </div>
        <ul className="p-6 space-y-3">
          {(
            [
              "admin.billing.features.seats",
              "admin.billing.features.storage",
              "admin.billing.features.support",
              "admin.billing.features.dataOwnership",
            ] as const
          ).map((key) => (
            <li key={key} className="flex items-start gap-3 text-sm text-[#CBD5E1]">
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden">
        <div className="p-6 border-b border-[#334155]">
          <h2 className="text-lg font-black text-white">{t("admin.billing.comingSoon.title")}</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">{t("admin.billing.comingSoon.desc")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-6">
          {(
            [
              { key: "admin.billing.comingSoon.plans", icon: <Users size={16} /> },
              { key: "admin.billing.comingSoon.invoices", icon: <CreditCard size={16} /> },
              { key: "admin.billing.comingSoon.payments", icon: <Mail size={16} /> },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-[#334155] bg-[#0F172A]/50 p-4 flex items-start gap-3"
            >
              <div className="p-2 rounded-lg border border-[#334155] bg-[#0F172A] text-[#94A3B8] shrink-0">
                {item.icon}
              </div>
              <p className="text-xs font-bold text-[#CBD5E1] leading-relaxed">{t(item.key)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e8bc69]/20 bg-[#e8bc69]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-white">{t("admin.billing.contact.title")}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">{t("admin.billing.contact.desc")}</p>
        </div>
        <a
          href="mailto:admin@cecit.edu.so"
          className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] shadow-lg shadow-[#e8bc69]/20 shrink-0"
        >
          <Mail size={14} /> {t("admin.billing.contact.cta")}
        </a>
      </div>
    </div>
  );
}
