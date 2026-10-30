"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Office } from "@/lib/types";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import {
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  Ban,
  Search,
  FlaskConical,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
  Save,
  Power,
  PowerOff,
  Layers,
  LayoutGrid,
  List,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type OfficeType = Office["type"];
type FilterType = "all" | OfficeType;
type FilterStatus = "all" | "active" | "inactive";
type ViewMode = "grid" | "list";

const OFFICE_TYPES: { value: OfficeType; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { value: "FACULTY", labelKey: "admin.offices.type.faculty", icon: <Building2 size={16} /> },
  { value: "LABS", labelKey: "admin.offices.type.labs", icon: <FlaskConical size={16} /> },
  {
    value: "ADMINISTRATION",
    labelKey: "admin.offices.type.administration",
    icon: <Briefcase size={16} />,
  },
];

const TYPE_TABS: { value: FilterType; labelKey: TranslationKey }[] = [
  { value: "all", labelKey: "admin.offices.type.all" },
  { value: "FACULTY", labelKey: "admin.offices.type.faculty" },
  { value: "LABS", labelKey: "admin.offices.type.labs" },
  { value: "ADMINISTRATION", labelKey: "admin.offices.type.administration" },
];

const TYPE_COLORS: Record<OfficeType, string> = {
  FACULTY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LABS: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  ADMINISTRATION: "bg-[#e8bc69]/10 text-[#e8bc69] border-[#e8bc69]/20",
};

const DEACTIVATE_REASON_KEYS: TranslationKey[] = [
  "admin.offices.reason.merged",
  "admin.offices.reason.unused",
  "admin.offices.reason.renamed",
  "admin.offices.reason.budget",
  "admin.offices.reason.restructuring",
];

const actionBtnClass =
  "flex w-full items-center gap-3 rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#334155] transition";

export default function AdminOfficesPage() {
  const { t } = usePreferences();
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<OfficeType>("FACULTY");
  const [busy, setBusy] = useState(false);

  // Row actions menu
  const [actionsOffice, setActionsOffice] = useState<Office | null>(null);

  // Edit modal
  const [editOffice, setEditOffice] = useState<Office | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<OfficeType>("FACULTY");

  // Deactivate modal
  const [deactivateOffice, setDeactivateOffice] = useState<Office | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateNote, setDeactivateNote] = useState("");

  // Delete modal
  const [deleteOffice, setDeleteOffice] = useState<Office | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const loadOffices = useCallback(async () => {
    try {
      const res = await api<{ data: Office[] }>("/offices?includeInactive=true");
      setOffices(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.offices.error.load"));
    }
  }, [t]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  const stats = useMemo(() => {
    if (!offices) return { total: 0, active: 0, inactive: 0, labs: 0 };
    return {
      total: offices.length,
      active: offices.filter((o) => o.active).length,
      inactive: offices.filter((o) => !o.active).length,
      labs: offices.filter((o) => o.type === "LABS").length,
    };
  }, [offices]);

  const filteredOffices = useMemo(() => {
    if (!offices) return [];
    const q = searchQuery.trim().toLowerCase();
    return offices.filter((o) => {
      const matchesSearch = !q || o.name.toLowerCase().includes(q);
      const matchesType = filterType === "all" || o.type === filterType;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && o.active) ||
        (filterStatus === "inactive" && !o.active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [offices, searchQuery, filterType, filterStatus]);

  const filtersActive = searchQuery.trim() !== "" || filterType !== "all" || filterStatus !== "all";

  // ── Handlers ─────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/offices", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });
      setAnnouncement(t("admin.offices.announce.created", { name }));
      setName("");
      setType("FACULTY");
      setIsModalOpen(false);
      await loadOffices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.offices.error.create"));
    } finally {
      setBusy(false);
    }
  }

  async function reactivate(o: Office) {
    setActionBusy(o.id);
    setError(null);
    try {
      await api(`/offices/${o.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: true }),
      });
      setAnnouncement(t("admin.offices.announce.reactivated", { name: o.name }));
      await loadOffices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.offices.error.reactivate"));
    } finally {
      setActionBusy(null);
    }
  }

  function openDeactivate(o: Office) {
    setDeactivateOffice(o);
    setDeactivateReason("");
    setDeactivateNote("");
  }

  async function confirmDeactivate() {
    if (!deactivateOffice) return;
    const reason = deactivateReason.trim();
    if (!reason) {
      setError(t("admin.offices.error.reasonRequired"));
      return;
    }
    setActionBusy(deactivateOffice.id);
    setError(null);
    try {
      await api(`/offices/${deactivateOffice.id}/deactivate`, {
        method: "POST",
        body: JSON.stringify({
          reason,
          note: deactivateNote.trim() || undefined,
        }),
      });
      setAnnouncement(
        t("admin.offices.announce.deactivated", {
          name: deactivateOffice.name,
          reason,
        }),
      );
      setDeactivateOffice(null);
      setDeactivateReason("");
      setDeactivateNote("");
      await loadOffices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.offices.error.deactivate"));
    } finally {
      setActionBusy(null);
    }
  }

  function openEdit(o: Office) {
    setEditOffice(o);
    setEditName(o.name);
    setEditType(o.type);
  }

  async function saveEdit() {
    if (!editOffice) return;
    if (!editName.trim()) {
      setError(t("admin.offices.error.nameRequired"));
      return;
    }
    setActionBusy(editOffice.id);
    setError(null);
    try {
      await api(`/offices/${editOffice.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), type: editType }),
      });
      setAnnouncement(t("admin.offices.announce.updated", { name: editOffice.name }));
      setEditOffice(null);
      await loadOffices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.offices.error.update"));
    } finally {
      setActionBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleteOffice) return;
    if (deleteConfirm !== deleteOffice.name) {
      setError(t("admin.offices.error.nameMismatch"));
      return;
    }
    setActionBusy(deleteOffice.id);
    setError(null);
    try {
      await api(`/offices/${deleteOffice.id}`, { method: "DELETE" });
      setAnnouncement(t("admin.offices.announce.deleted", { name: deleteOffice.name }));
      setDeleteOffice(null);
      setDeleteConfirm("");
      await loadOffices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.offices.error.delete"));
    } finally {
      setActionBusy(null);
    }
  }

  // ── Render helpers ───────────────────────────────────────────
  const renderGridCard = (office: Office) => {
    const busyRow = actionBusy === office.id;
    const typeMeta = OFFICE_TYPES.find((o) => o.value === office.type);
    return (
      <div
        key={office.id}
        className={`group flex flex-col gap-4 p-4 rounded-xl border transition-all ${
          office.active
            ? "border-[#334155] bg-[#0F172A]/50 hover:border-[#e8bc69]/40"
            : "border-[#334155] bg-[#0F172A]/20"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2.5 rounded-lg border shrink-0 ${TYPE_COLORS[office.type]}`}>
              {typeMeta?.icon}
            </div>
            <div className="min-w-0">
              <h3
                className={`font-bold text-base truncate ${
                  office.active ? "text-white" : "text-[#94A3B8] line-through"
                }`}
                title={office.name}
              >
                {office.name}
              </h3>
              <span
                className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_COLORS[office.type]}`}
              >
                {typeMeta ? t(typeMeta.labelKey) : office.type}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActionsOffice(office)}
            disabled={busyRow}
            title={t("admin.offices.action.more")}
            aria-label={`${t("admin.offices.action.more")} — ${office.name}`}
            className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition disabled:opacity-50 shrink-0"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          {office.active ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("admin.offices.status.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
              <Ban size={11} /> {t("admin.offices.status.inactive")}
            </span>
          )}

          {office.active ? (
            <button
              onClick={() => openDeactivate(office)}
              disabled={busyRow}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              <Ban size={13} /> {t("admin.offices.action.deactivate")}
            </button>
          ) : (
            <button
              onClick={() => void reactivate(office)}
              disabled={busyRow}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              <CheckCircle2 size={13} /> {t("admin.offices.action.reactivate")}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderListRow = (office: Office) => {
    const busyRow = actionBusy === office.id;
    const typeMeta = OFFICE_TYPES.find((o) => o.value === office.type);
    return (
      <tr key={office.id} className="hover:bg-[#0F172A]/60 transition-colors group">
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border shrink-0 ${TYPE_COLORS[office.type]}`}>
              {typeMeta?.icon}
            </div>
            <p
              className={`font-bold truncate ${
                office.active ? "text-white" : "text-[#94A3B8] line-through"
              }`}
            >
              {office.name}
            </p>
          </div>
        </td>
        <td className="px-5 py-3">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${TYPE_COLORS[office.type]}`}
          >
            {typeMeta ? t(typeMeta.labelKey) : office.type}
          </span>
        </td>
        <td className="px-5 py-3">
          {office.active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("admin.offices.status.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
              <Ban size={11} /> {t("admin.offices.status.inactive")}
            </span>
          )}
        </td>
        <td className="px-5 py-3 text-end">
          <div className="inline-flex items-center gap-1">
            {office.active ? (
              <button
                onClick={() => openDeactivate(office)}
                disabled={busyRow}
                title={t("admin.offices.action.deactivate")}
                aria-label={`${t("admin.offices.action.deactivate")} — ${office.name}`}
                className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
              >
                <Ban size={14} />
              </button>
            ) : (
              <button
                onClick={() => void reactivate(office)}
                disabled={busyRow}
                title={t("admin.offices.action.reactivate")}
                aria-label={`${t("admin.offices.action.reactivate")} — ${office.name}`}
                className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
              </button>
            )}
            <button
              onClick={() => setActionsOffice(office)}
              disabled={busyRow}
              title={t("admin.offices.action.more")}
              aria-label={`${t("admin.offices.action.more")} — ${office.name}`}
              className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition disabled:opacity-50"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ── Early returns ────────────────────────────────────────────
  if (error && !offices) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">{t("admin.offices.error.load")}</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!offices) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
        <div className="h-10 w-64 rounded bg-[#1E293B] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-[#1E293B] border border-[#334155] animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-[#1E293B] border border-[#334155] animate-pulse" />
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            {t("admin.offices.subtitle") ? t("nav.offices") : t("nav.offices")}
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{t("admin.offices.title")}</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">{t("admin.offices.subtitle")}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] shadow-lg shadow-[#e8bc69]/20 self-start sm:self-auto"
        >
          <Plus size={16} /> {t("admin.offices.add")}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400"
        >
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <p>{error}</p>
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="text-white" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.offices.stats.total")}
            </p>
          </div>
          <p className="text-2xl font-black text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-emerald-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.offices.stats.active")}
            </p>
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="text-red-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.offices.stats.inactive")}
            </p>
          </div>
          <p className="text-2xl font-black text-red-400">{stats.inactive}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="text-violet-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.offices.stats.labs")}
            </p>
          </div>
          <p className="text-2xl font-black text-violet-400">{stats.labs}</p>
        </div>
      </section>

      {/* Main card */}
      <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#334155] space-y-3">
          {/* Type tabs + count */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label={t("admin.offices.title")}
              className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-xl border border-[#334155]"
            >
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={filterType === tab.value}
                  onClick={() => setFilterType(tab.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                    filterType === tab.value
                      ? "bg-[#1E293B] text-white shadow-sm border border-[#334155]"
                      : "text-[#94A3B8] hover:text-white border border-transparent"
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            <span className="text-xs font-bold text-[#94A3B8] bg-[#0F172A] px-3 py-1.5 rounded-lg border border-[#334155]">
              {filteredOffices.length === 1
                ? t("admin.offices.countOne", { count: filteredOffices.length })
                : t("admin.offices.count", { count: filteredOffices.length })}
            </span>
          </div>

          {/* Search + status + view */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder={t("admin.offices.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] py-2 pl-10 pr-4 text-sm text-white placeholder-[#94A3B8] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]/40"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              aria-label={t("admin.offices.status.all")}
              className="rounded-xl border border-[#334155] bg-[#0F172A] px-3 py-2 text-xs font-bold text-white outline-none focus:border-[#e8bc69]"
            >
              <option value="all">{t("admin.offices.status.all")}</option>
              <option value="active">{t("admin.offices.status.active")}</option>
              <option value="inactive">{t("admin.offices.status.inactive")}</option>
            </select>

            <div className="flex items-center gap-0.5 bg-[#0F172A] p-0.5 rounded-xl border border-[#334155] self-start sm:self-auto">
              <button
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                title={t("admin.offices.view.grid")}
                aria-label={t("admin.offices.view.grid")}
                className={`rounded-lg p-2 transition ${
                  viewMode === "grid"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                title={t("admin.offices.view.list")}
                aria-label={t("admin.offices.view.list")}
                className={`rounded-lg p-2 transition ${
                  viewMode === "list"
                    ? "bg-[#1E293B] text-white"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredOffices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto max-w-md space-y-2">
              <Layers className="mx-auto h-8 w-8 text-[#334155]" />
              <p className="text-sm font-bold text-white">
                {filtersActive
                  ? t("admin.offices.empty.search", { query: searchQuery || "…" })
                  : t("admin.offices.empty.none")}
              </p>
              {!filtersActive && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#e8bc69] px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-[#f1cf8b]"
                >
                  <Plus size={12} /> {t("admin.offices.add")}
                </button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {filteredOffices.map(renderGridCard)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-[#0F172A] text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                <tr>
                  <th scope="col" className="px-5 py-3 text-start">
                    {t("admin.offices.table.office")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-start">
                    {t("admin.offices.table.type")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-start">
                    {t("admin.offices.table.status")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-end">
                    {t("admin.offices.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filteredOffices.map(renderListRow)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("admin.offices.create.title")}
        description={t("admin.offices.create.desc")}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="create-name"
              className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider"
            >
              {t("admin.offices.create.name")}
            </label>
            <input
              id="create-name"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.offices.create.namePlaceholder")}
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#e8bc69]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              {t("admin.offices.create.type")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OFFICE_TYPES.map((t2) => (
                <button
                  key={t2.value}
                  type="button"
                  onClick={() => setType(t2.value)}
                  aria-pressed={type === t2.value}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    type === t2.value
                      ? "border-[#e8bc69] bg-[#e8bc69]/10 text-[#e8bc69]"
                      : "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:bg-[#334155]"
                  }`}
                >
                  {t2.icon}
                  {t(t2.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50"
            >
              {busy ? t("admin.offices.create.creating") : t("admin.offices.create.submit")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Row actions */}
      <Modal
        isOpen={!!actionsOffice}
        onClose={() => setActionsOffice(null)}
        title={actionsOffice?.name ?? ""}
        description={
          actionsOffice
            ? `${t("admin.offices.table.type")}: ${
                OFFICE_TYPES.find((o) => o.value === actionsOffice.type)?.labelKey
                  ? t(OFFICE_TYPES.find((o) => o.value === actionsOffice.type)!.labelKey)
                  : actionsOffice.type
              }`
            : ""
        }
      >
        {actionsOffice && (
          <div className="space-y-2">
            <button
              onClick={() => {
                openEdit(actionsOffice);
                setActionsOffice(null);
              }}
              className={actionBtnClass}
            >
              <Pencil size={16} className="text-[#e8bc69]" /> {t("admin.offices.action.edit")}
            </button>

            {actionsOffice.active ? (
              <button
                onClick={() => {
                  openDeactivate(actionsOffice);
                  setActionsOffice(null);
                }}
                className={`${actionBtnClass} !border-red-500/20 hover:!bg-red-500/10 !text-red-400`}
              >
                <PowerOff size={16} /> {t("admin.offices.action.deactivate")}
              </button>
            ) : (
              <button
                onClick={() => {
                  const o = actionsOffice;
                  setActionsOffice(null);
                  void reactivate(o);
                }}
                className={`${actionBtnClass} !border-emerald-500/20 hover:!bg-emerald-500/10 !text-emerald-400`}
              >
                <Power size={16} /> {t("admin.offices.action.reactivate")}
              </button>
            )}

            <button
              onClick={() => {
                setDeleteOffice(actionsOffice);
                setDeleteConfirm("");
                setActionsOffice(null);
              }}
              className={`${actionBtnClass} !border-red-500/20 hover:!bg-red-500/10 !text-red-400`}
            >
              <Trash2 size={16} /> {t("admin.offices.action.delete")}
            </button>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editOffice}
        onClose={() => setEditOffice(null)}
        title={t("admin.offices.edit.title")}
        description={editOffice?.name ?? ""}
      >
        {editOffice && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-name"
                className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider"
              >
                {t("admin.offices.edit.name")}
              </label>
              <input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.offices.edit.type")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {OFFICE_TYPES.map((t2) => (
                  <button
                    key={t2.value}
                    type="button"
                    onClick={() => setEditType(t2.value)}
                    aria-pressed={editType === t2.value}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                      editType === t2.value
                        ? "border-[#e8bc69] bg-[#e8bc69]/10 text-[#e8bc69]"
                        : "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:bg-[#334155]"
                    }`}
                  >
                    {t2.icon}
                    {t(t2.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setEditOffice(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void saveEdit()}
                disabled={actionBusy === editOffice.id || !editName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50"
              >
                <Save size={14} /> {t("admin.offices.edit.save")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate modal */}
      <Modal
        isOpen={!!deactivateOffice}
        onClose={() => setDeactivateOffice(null)}
        title={t("admin.offices.deactivate.title")}
        description={t("admin.offices.deactivate.desc", {
          name: deactivateOffice?.name ?? "",
        })}
      >
        {deactivateOffice && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.offices.deactivate.reason")} <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEACTIVATE_REASON_KEYS.map((key) => {
                  const label = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDeactivateReason(label)}
                      aria-pressed={deactivateReason === label}
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                        deactivateReason === label
                          ? "border-[#e8bc69] bg-[#e8bc69]/10 text-[#e8bc69]"
                          : "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <input
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder={t("admin.offices.deactivate.reasonCustom")}
                className="mt-2 w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#e8bc69]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.offices.deactivate.note")}
              </label>
              <textarea
                rows={3}
                value={deactivateNote}
                onChange={(e) => setDeactivateNote(e.target.value)}
                placeholder={t("admin.offices.deactivate.notePlaceholder")}
                className="w-full resize-none rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#e8bc69]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setDeactivateOffice(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void confirmDeactivate()}
                disabled={actionBusy === deactivateOffice.id || !deactivateReason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
              >
                <Ban size={14} /> {t("admin.offices.deactivate.submit")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal
        isOpen={!!deleteOffice}
        onClose={() => setDeleteOffice(null)}
        title={t("admin.offices.delete.title")}
        description={t("admin.offices.delete.desc")}
      >
        {deleteOffice && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <p className="font-bold mb-1">{t("admin.offices.delete.warning")}</p>
              <p className="text-xs break-all">{deleteOffice.name}</p>
              <p className="text-xs text-red-400/80 mt-1">
                {t("admin.offices.delete.warningTasks")}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.offices.delete.confirmLabel")}
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteOffice.name}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setDeleteOffice(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={actionBusy === deleteOffice.id || deleteConfirm !== deleteOffice.name}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 size={14} /> {t("admin.offices.delete.submit")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
