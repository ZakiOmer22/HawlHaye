"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/types";
import { Plus, Tag, CheckCircle2, AlertCircle, Ban } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#e8bc69");
  const [busy, setBusy] = useState(false);

  async function loadCategories() {
    try {
      const res = await api<{ data: Category[] }>("/categories");
      setCategories(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load categories");
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name, color }),
      });
      setName("");
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create category");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: boolean) {
    try {
      if (currentStatus) {
        await api(`/categories/${id}/deactivate`, { method: "POST" });
      } else {
        // Assuming a reactivate endpoint or patch exists
        await api(`/categories/${id}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
      }
      await loadCategories();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update category");
    }
  }

  if (error && !categories) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <h2 className="text-lg font-bold mb-1">Failed to load categories</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!categories) return <div className="p-8 text-center text-[#94A3B8]">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
          Administration
        </p>
        <h1 className="mt-1 text-3xl font-black text-white">Task Categories</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Manage the coloured categories used across the board.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="md:col-span-1 rounded-2xl border border-[#334155] bg-[#1E293B] p-6 h-fit">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={16} className="text-[#e8bc69]" /> New Category
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Category Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. IT Support"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Colour Hex
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
                />
              </div>
            </div>

            <button
              disabled={busy || !name}
              type="submit"
              className="w-full rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50 mt-2"
            >
              {busy ? "Creating..." : "Create Category"}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="md:col-span-2 rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#0F172A]/50">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag size={16} className="text-[#e8bc69]" /> Active Categories
            </h2>
            <span className="text-xs font-bold text-[#94A3B8]">{categories.length} Total</span>
          </div>
          <div className="divide-y divide-[#334155]">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 hover:bg-[#0F172A]/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-4 w-4 rounded-full shadow-inner border border-white/20"
                    style={{ backgroundColor: c.color || "#94A3B8" }}
                  />
                  <div>
                    <p
                      className={`font-bold ${c.active ? "text-white" : "text-[#94A3B8] line-through"}`}
                    >
                      {c.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-0.5">
                      {c.color || "No color"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(c.id, c.active)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    c.active
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {c.active ? (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
