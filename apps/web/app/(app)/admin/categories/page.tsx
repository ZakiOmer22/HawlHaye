"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import {
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle,
  Ban,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Save,
  Power,
  PowerOff,
  Layers,
  Palette,
  LayoutGrid,
  List,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type FilterStatus = "all" | "active" | "inactive";
type ViewMode = "grid" | "list";

const PRESET_COLORS = [
  "#e8bc69",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
];

const DEACTIVATE_REASON_KEYS: TranslationKey[] = [
  "admin.categories.reason.duplicate",
  "admin.categories.reason.unused",
  "admin.categories.reason.consolidated",
  "admin.categories.reason.deprecated",
  "admin.categories.reason.wrongColor",
];

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const actionBtnClass =
  "flex w-full items-center gap-3 rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#334155] transition";

export default function AdminCategoriesPage() {
  const { t } = usePreferences();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#e8bc69");
  const [busy, setBusy] = useState(false);

  // Row actions menu
  const [actionsCategory, setActionsCategory] = useState<Category | null>(null);

  // Edit modal
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#e8bc69");

  // Deactivate modal
  const [deactivateCategory, setDeactivateCategory] = useState<Category | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateNote, setDeactivateNote] = useState("");

  // Delete modal
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      const res = await api<{ data: Category[] }>("/categories?includeInactive=true");
      setCategories(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.categories.error.load"));
    }
  }, [t]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const stats = useMemo(() => {
    if (!categories) return { total: 0, active: 0, inactive: 0, colors: 0 };
    const colors = new Set(categories.filter((c) => c.color).map((c) => c.color!.toLowerCase()));
    return {
      total: categories.length,
      active: categories.filter((c) => c.active).length,
      inactive: categories.filter((c) => !c.active).length,
      colors: colors.size,
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((c) => {
      const matchesSearch =
        !q || c.name.toLowerCase().includes(q) || (c.color ?? "").toLowerCase().includes(q);
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && c.active) ||
        (filterStatus === "inactive" && !c.active);
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, filterStatus]);

  const filtersActive = searchQuery.trim() !== "" || filterStatus !== "all";

  const nameExists = useCallback(
    (n: string, excludeId?: string) => {
      if (!categories) return false;
      const trimmed = n.trim().toLowerCase();
      return categories.some((c) => c.id !== excludeId && c.name.trim().toLowerCase() === trimmed);
    },
    [categories],
  );

  // ── Handlers ─────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (nameExists(trimmed)) {
      setError(t("admin.categories.error.duplicate"));
      return;
    }
    if (!HEX_REGEX.test(color)) {
      setError(t("admin.categories.error.invalidColor"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, color }),
      });
      setAnnouncement(t("admin.categories.announce.created", { name: trimmed }));
      setName("");
      setColor("#e8bc69");
      setIsCreateOpen(false);
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.categories.error.create"));
    } finally {
      setBusy(false);
    }
  }

  async function reactivate(c: Category) {
    setActionBusy(c.id);
    setError(null);
    try {
      await api(`/categories/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: true }),
      });
      setAnnouncement(t("admin.categories.announce.reactivated", { name: c.name }));
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.categories.error.reactivate"));
    } finally {
      setActionBusy(null);
    }
  }

  function openDeactivate(c: Category) {
    setDeactivateCategory(c);
    setDeactivateReason("");
    setDeactivateNote("");
  }

  async function confirmDeactivate() {
    if (!deactivateCategory) return;
    const reason = deactivateReason.trim();
    if (!reason) {
      setError(t("admin.categories.error.reasonRequired"));
      return;
    }
    setActionBusy(deactivateCategory.id);
    setError(null);
    try {
      await api(`/categories/${deactivateCategory.id}/deactivate`, {
        method: "POST",
        body: JSON.stringify({
          reason,
          note: deactivateNote.trim() || undefined,
        }),
      });
      setAnnouncement(
        t("admin.categories.announce.deactivated", {
          name: deactivateCategory.name,
          reason,
        }),
      );
      setDeactivateCategory(null);
      setDeactivateReason("");
      setDeactivateNote("");
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.categories.error.deactivate"));
    } finally {
      setActionBusy(null);
    }
  }

  function openEdit(c: Category) {
    setEditCategory(c);
    setEditName(c.name);
    setEditColor(c.color || "#e8bc69");
  }

  async function saveEdit() {
    if (!editCategory) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setError(t("admin.categories.error.nameRequired"));
      return;
    }
    if (nameExists(trimmed, editCategory.id)) {
      setError(t("admin.categories.error.duplicate"));
      return;
    }
    if (!HEX_REGEX.test(editColor)) {
      setError(t("admin.categories.error.invalidColor"));
      return;
    }
    setActionBusy(editCategory.id);
    setError(null);
    try {
      await api(`/categories/${editCategory.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed, color: editColor }),
      });
      setAnnouncement(t("admin.categories.announce.updated", { name: editCategory.name }));
      setEditCategory(null);
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.categories.error.update"));
    } finally {
      setActionBusy(null);
    }
  }

  async function confirmDelete() {
    if (!deleteCategory) return;
    if (deleteConfirm !== deleteCategory.name) {
      setError(t("admin.categories.error.nameMismatch"));
      return;
    }
    setActionBusy(deleteCategory.id);
    setError(null);
    try {
      await api(`/categories/${deleteCategory.id}`, { method: "DELETE" });
      setAnnouncement(t("admin.categories.announce.deleted", { name: deleteCategory.name }));
      setDeleteCategory(null);
      setDeleteConfirm("");
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("admin.categories.error.delete"));
    } finally {
      setActionBusy(null);
    }
  }

  // ── Shared color field (used by create + edit) ───────────────
  const renderColorPicker = (
    currentColor: string,
    onChange: (c: string) => void,
    idPrefix: string,
  ) => (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((preset) => {
          const selected = currentColor.toLowerCase() === preset.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-pressed={selected}
              aria-label={preset}
              title={preset}
              className={`h-8 w-8 rounded-lg border-2 transition ${
                selected
                  ? "border-white shadow-[0_0_0_2px_#e8bc69]"
                  : "border-[#334155] hover:border-[#94A3B8]"
              }`}
              style={{ backgroundColor: preset }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-color-picker`}
          type="color"
          value={HEX_REGEX.test(currentColor) ? currentColor : "#e8bc69"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={t("admin.categories.create.color")}
          className="h-10 w-10 shrink-0 rounded cursor-pointer border-0 bg-transparent p-0"
        />
        <input
          id={`${idPrefix}-color-hex`}
          type="text"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className={`flex-1 rounded-xl border bg-[#0F172A] px-4 py-2.5 text-sm font-mono text-white outline-none ${
            HEX_REGEX.test(currentColor)
              ? "border-[#334155] focus:border-[#e8bc69]"
              : "border-red-500/60 focus:border-red-500"
          }`}
        />
      </div>
    </div>
  );

  // ── Render helpers ───────────────────────────────────────────
  const renderPreviewPill = (label: string, c: string) => {
    const safe = HEX_REGEX.test(c) ? c : "#94A3B8";
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#0F172A] px-3 py-2">
        <div className="h-3 w-3 rounded-full shadow-inner" style={{ backgroundColor: safe }} />
        <span className="text-sm font-bold text-white truncate">
          {label || t("admin.categories.create.previewPlaceholder")}
        </span>
      </div>
    );
  };

  const renderGridCard = (c: Category) => {
    const busyRow = actionBusy === c.id;
    const safeColor = c.color || "#94A3B8";
    return (
      <div
        key={c.id}
        className={`group flex flex-col gap-3 p-4 rounded-xl border transition-all ${
          c.active
            ? "border-[#334155] bg-[#0F172A]/50 hover:border-[#e8bc69]/40"
            : "border-[#334155] bg-[#0F172A]/20"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="mt-1 h-8 w-8 shrink-0 rounded-lg border border-white/10 shadow-inner"
              style={{ backgroundColor: safeColor }}
              aria-hidden
            />
            <div className="min-w-0">
              <h3
                className={`font-bold text-base truncate ${
                  c.active ? "text-white" : "text-[#94A3B8] line-through"
                }`}
                title={c.name}
              >
                {c.name}
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] mt-1">
                {c.color || t("admin.categories.noColor")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActionsCategory(c)}
            disabled={busyRow}
            title={t("admin.categories.action.more")}
            aria-label={`${t("admin.categories.action.more")} — ${c.name}`}
            className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition disabled:opacity-50 shrink-0"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
          {c.active ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("admin.categories.status.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
              <Ban size={11} /> {t("admin.categories.status.inactive")}
            </span>
          )}

          {c.active ? (
            <button
              onClick={() => openDeactivate(c)}
              disabled={busyRow}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              <Ban size={13} /> {t("admin.categories.action.deactivate")}
            </button>
          ) : (
            <button
              onClick={() => void reactivate(c)}
              disabled={busyRow}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              <CheckCircle2 size={13} /> {t("admin.categories.action.reactivate")}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderListRow = (c: Category) => {
    const busyRow = actionBusy === c.id;
    const safeColor = c.color || "#94A3B8";
    return (
      <tr key={c.id} className="hover:bg-[#0F172A]/60 transition-colors">
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 shrink-0 rounded-full border border-white/20 shadow-inner"
              style={{ backgroundColor: safeColor }}
              aria-hidden
            />
            <p
              className={`font-bold truncate ${
                c.active ? "text-white" : "text-[#94A3B8] line-through"
              }`}
            >
              {c.name}
            </p>
          </div>
        </td>
        <td className="px-5 py-3">
          <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
            {c.color || t("admin.categories.noColor")}
          </span>
        </td>
        <td className="px-5 py-3">
          {c.active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("admin.categories.status.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
              <Ban size={11} /> {t("admin.categories.status.inactive")}
            </span>
          )}
        </td>
        <td className="px-5 py-3 text-end">
          <div className="inline-flex items-center gap-1">
            {c.active ? (
              <button
                onClick={() => openDeactivate(c)}
                disabled={busyRow}
                title={t("admin.categories.action.deactivate")}
                aria-label={`${t("admin.categories.action.deactivate")} — ${c.name}`}
                className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
              >
                <Ban size={14} />
              </button>
            ) : (
              <button
                onClick={() => void reactivate(c)}
                disabled={busyRow}
                title={t("admin.categories.action.reactivate")}
                aria-label={`${t("admin.categories.action.reactivate")} — ${c.name}`}
                className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
              </button>
            )}
            <button
              onClick={() => setActionsCategory(c)}
              disabled={busyRow}
              title={t("admin.categories.action.more")}
              aria-label={`${t("admin.categories.action.more")} — ${c.name}`}
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
  if (error && !categories) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center"
        >
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">{t("admin.categories.error.load")}</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!categories) {
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
            {t("nav.categories")}
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{t("admin.categories.title")}</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">{t("admin.categories.subtitle")}</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] shadow-lg shadow-[#e8bc69]/20 self-start sm:self-auto"
        >
          <Plus size={16} /> {t("admin.categories.add")}
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
              {t("admin.categories.stats.total")}
            </p>
          </div>
          <p className="text-2xl font-black text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-emerald-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.categories.stats.active")}
            </p>
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="text-red-400" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.categories.stats.inactive")}
            </p>
          </div>
          <p className="text-2xl font-black text-red-400">{stats.inactive}</p>
        </div>
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="text-[#e8bc69]" size={16} />
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("admin.categories.stats.colors")}
            </p>
          </div>
          <p className="text-2xl font-black text-[#e8bc69]">{stats.colors}</p>
        </div>
      </section>

      {/* Main card */}
      <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#334155] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label={t("admin.categories.title")}
              className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-xl border border-[#334155]"
            >
              {(["all", "active", "inactive"] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filterStatus === f}
                  onClick={() => setFilterStatus(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                    filterStatus === f
                      ? "bg-[#1E293B] text-white shadow-sm border border-[#334155]"
                      : "text-[#94A3B8] hover:text-white border border-transparent"
                  }`}
                >
                  {f === "all"
                    ? t("admin.categories.status.all")
                    : f === "active"
                      ? t("admin.categories.status.active")
                      : t("admin.categories.status.inactive")}
                </button>
              ))}
            </div>

            <span className="text-xs font-bold text-[#94A3B8] bg-[#0F172A] px-3 py-1.5 rounded-lg border border-[#334155]">
              {filteredCategories.length === 1
                ? t("admin.categories.countOne", { count: filteredCategories.length })
                : t("admin.categories.count", { count: filteredCategories.length })}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder={t("admin.categories.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] py-2 pl-10 pr-4 text-sm text-white placeholder-[#94A3B8] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69]/40"
              />
            </div>

            <div className="flex items-center gap-0.5 bg-[#0F172A] p-0.5 rounded-xl border border-[#334155] self-start sm:self-auto">
              <button
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                title={t("admin.categories.view.grid")}
                aria-label={t("admin.categories.view.grid")}
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
                title={t("admin.categories.view.list")}
                aria-label={t("admin.categories.view.list")}
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
        {filteredCategories.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto max-w-md space-y-2">
              <Tag className="mx-auto h-8 w-8 text-[#334155]" />
              <p className="text-sm font-bold text-white">
                {filtersActive
                  ? t("admin.categories.empty.search", { query: searchQuery || "…" })
                  : t("admin.categories.empty.none")}
              </p>
              {!filtersActive && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#e8bc69] px-3 py-1.5 text-xs font-bold text-[#0F172A] hover:bg-[#f1cf8b]"
                >
                  <Plus size={12} /> {t("admin.categories.add")}
                </button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {filteredCategories.map(renderGridCard)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-[#0F172A] text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                <tr>
                  <th scope="col" className="px-5 py-3 text-start">
                    {t("admin.categories.table.category")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-start">
                    {t("admin.categories.table.color")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-start">
                    {t("admin.categories.table.status")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-end">
                    {t("admin.categories.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filteredCategories.map(renderListRow)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t("admin.categories.create.title")}
        description={t("admin.categories.create.desc")}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="create-name"
              className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider"
            >
              {t("admin.categories.create.name")}
            </label>
            <input
              id="create-name"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.categories.create.namePlaceholder")}
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#e8bc69]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              {t("admin.categories.create.color")}
            </label>
            {renderColorPicker(color, setColor, "create")}
            <p className="text-[10px] text-[#94A3B8]">{t("admin.categories.create.colorHint")}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              {t("admin.categories.create.preview")}
            </label>
            {renderPreviewPill(name, color)}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy || !name.trim() || !HEX_REGEX.test(color)}
              className="rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50"
            >
              {busy ? t("admin.categories.create.creating") : t("admin.categories.create.submit")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Row actions menu */}
      <Modal
        isOpen={!!actionsCategory}
        onClose={() => setActionsCategory(null)}
        title={actionsCategory?.name ?? ""}
        description={
          actionsCategory
            ? `${t("admin.categories.table.color")}: ${actionsCategory.color || t("admin.categories.noColor")}`
            : ""
        }
      >
        {actionsCategory && (
          <div className="space-y-2">
            <button
              onClick={() => {
                openEdit(actionsCategory);
                setActionsCategory(null);
              }}
              className={actionBtnClass}
            >
              <Pencil size={16} className="text-[#e8bc69]" /> {t("admin.categories.action.edit")}
            </button>

            {actionsCategory.active ? (
              <button
                onClick={() => {
                  openDeactivate(actionsCategory);
                  setActionsCategory(null);
                }}
                className={`${actionBtnClass} !border-red-500/20 hover:!bg-red-500/10 !text-red-400`}
              >
                <PowerOff size={16} /> {t("admin.categories.action.deactivate")}
              </button>
            ) : (
              <button
                onClick={() => {
                  const c = actionsCategory;
                  setActionsCategory(null);
                  void reactivate(c);
                }}
                className={`${actionBtnClass} !border-emerald-500/20 hover:!bg-emerald-500/10 !text-emerald-400`}
              >
                <Power size={16} /> {t("admin.categories.action.reactivate")}
              </button>
            )}

            <button
              onClick={() => {
                setDeleteCategory(actionsCategory);
                setDeleteConfirm("");
                setActionsCategory(null);
              }}
              className={`${actionBtnClass} !border-red-500/20 hover:!bg-red-500/10 !text-red-400`}
            >
              <Trash2 size={16} /> {t("admin.categories.action.delete")}
            </button>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editCategory}
        onClose={() => setEditCategory(null)}
        title={t("admin.categories.edit.title")}
        description={editCategory?.name ?? ""}
      >
        {editCategory && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-name"
                className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider"
              >
                {t("admin.categories.edit.name")}
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
                {t("admin.categories.edit.color")}
              </label>
              {renderColorPicker(editColor, setEditColor, "edit")}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.categories.create.preview")}
              </label>
              {renderPreviewPill(editName, editColor)}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setEditCategory(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void saveEdit()}
                disabled={
                  actionBusy === editCategory.id || !editName.trim() || !HEX_REGEX.test(editColor)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50"
              >
                <Save size={14} /> {t("admin.categories.edit.save")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate modal */}
      <Modal
        isOpen={!!deactivateCategory}
        onClose={() => setDeactivateCategory(null)}
        title={t("admin.categories.deactivate.title")}
        description={t("admin.categories.deactivate.desc", {
          name: deactivateCategory?.name ?? "",
        })}
      >
        {deactivateCategory && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.categories.deactivate.reason")} <span className="text-red-400">*</span>
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
                placeholder={t("admin.categories.deactivate.reasonCustom")}
                className="mt-2 w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#e8bc69]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.categories.deactivate.note")}
              </label>
              <textarea
                rows={3}
                value={deactivateNote}
                onChange={(e) => setDeactivateNote(e.target.value)}
                placeholder={t("admin.categories.deactivate.notePlaceholder")}
                className="w-full resize-none rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-[#e8bc69]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setDeactivateCategory(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void confirmDeactivate()}
                disabled={actionBusy === deactivateCategory.id || !deactivateReason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
              >
                <Ban size={14} /> {t("admin.categories.deactivate.submit")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        title={t("admin.categories.delete.title")}
        description={t("admin.categories.delete.desc")}
      >
        {deleteCategory && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <p className="font-bold mb-1">{t("admin.categories.delete.warning")}</p>
              <p className="text-xs break-all">{deleteCategory.name}</p>
              <p className="text-xs text-red-400/80 mt-1">
                {t("admin.categories.delete.warningTasks")}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                {t("admin.categories.delete.confirmLabel")}
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteCategory.name}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white placeholder-[#94A3B8] outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setDeleteCategory(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={actionBusy === deleteCategory.id || deleteConfirm !== deleteCategory.name}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 size={14} /> {t("admin.categories.delete.submit")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
