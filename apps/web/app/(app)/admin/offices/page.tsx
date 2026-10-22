"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Office } from "@/lib/types";
import {
  Plus,
  Building2,
  CheckCircle2,
  AlertCircle,
  Ban,
  Search,
  FlaskConical,
  Briefcase,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type OfficeType = Office["type"];

const OFFICE_TYPES: { value: OfficeType; label: string; icon: React.ReactNode }[] = [
  { value: "FACULTY", label: "Faculty", icon: <Building2 size={16} /> },
  { value: "LABS", label: "Laboratory", icon: <FlaskConical size={16} /> },
  { value: "ADMINISTRATION", label: "Administration", icon: <Briefcase size={16} /> },
];

const TYPE_COLORS: Record<OfficeType, string> = {
  FACULTY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LABS: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  ADMINISTRATION: "bg-[#e8bc69]/10 text-[#e8bc69] border-[#e8bc69]/20",
};

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<OfficeType>("FACULTY");
  const [busy, setBusy] = useState(false);

  async function loadOffices() {
    try {
      const res = await api<{ data: Office[] }>("/offices");
      setOffices(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load offices");
    }
  }

  useEffect(() => {
    void loadOffices();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/offices", {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });
      setName("");
      setType("FACULTY");
      setIsModalOpen(false);
      await loadOffices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create office");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: boolean) {
    try {
      if (currentStatus) {
        await api(`/offices/${id}/deactivate`, { method: "POST" });
      } else {
        await api(`/offices/${id}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
      }
      await loadOffices();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update office");
    }
  }

  // Filter offices based on search
  const filteredOffices =
    offices?.filter(
      (o) =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.type.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  if (error && !offices) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load offices</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!offices) {
    return <div className="p-8 text-center text-[#94A3B8]">Loading offices...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">Offices & Departments</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Manage the faculties, labs, and administrative offices used for task routing.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#0F172A] transition hover:bg-[#f1cf8b] shadow-lg shadow-[#e8bc69]/20"
        >
          <Plus size={16} /> Add Office
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {error}
        </div>
      )}

      {/* Main List */}
      <div className="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-[#334155] flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search offices by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-[#e8bc69]"
            />
          </div>
          <span className="text-xs font-bold text-[#94A3B8] bg-[#0F172A] px-3 py-1.5 rounded-lg border border-[#334155]">
            {filteredOffices.length} Offices
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {filteredOffices.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-[#94A3B8]">
              No offices found matching "{searchQuery}".
            </div>
          ) : (
            filteredOffices.map((office) => (
              <div
                key={office.id}
                className={`group flex items-start justify-between p-5 rounded-xl border transition-all ${
                  office.active
                    ? "border-[#334155] bg-[#0F172A]/50 hover:border-[#e8bc69]/40"
                    : "border-[#334155] bg-[#0F172A]/20 opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg border ${TYPE_COLORS[office.type]}`}>
                    {OFFICE_TYPES.find((t) => t.value === office.type)?.icon}
                  </div>
                  <div>
                    <h3
                      className={`font-bold text-base ${office.active ? "text-white" : "text-[#94A3B8] line-through"}`}
                    >
                      {office.name}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mt-1">
                      {office.type}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(office.id, office.active)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    office.active
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {office.active ? (
                    <>
                      <Ban size={14} /> Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Reactivate
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Office"
        description="Create a new department or faculty to route tasks to."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Office Name
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Faculty of Medicine"
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              Office Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OFFICE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    type === t.value
                      ? "border-[#e8bc69] bg-[#e8bc69]/10 text-[#e8bc69]"
                      : "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:bg-[#334155]"
                  }`}
                >
                  {t.icon}
                  {t.label}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !name}
              className="rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50"
            >
              {busy ? "Creating..." : "Create Office"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
