"use client";

import { useEffect, useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import type { Category, Office, Priority, User } from "@/lib/types";
import { Search, ChevronDown, Check } from "lucide-react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  offices: Office[];
}

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// ── Custom Searchable Dropdown Component ───────────────────────
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  required,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((o) => o.id === value)?.label;

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Hidden input to enforce HTML5 required validation. Added readOnly to fix React warning. */}
      {required && (
        <input
          type="text"
          value={value}
          required
          readOnly
          className="absolute h-0 w-0 opacity-0"
          tabIndex={-1}
        />
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
      >
        <span className={selectedLabel ? "text-white" : "text-[#64748B]"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#64748B] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#334155] bg-[#1E293B] shadow-xl">
          <div className="flex items-center border-b border-[#334155] px-3 py-2">
            <Search className="h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-[#64748B]"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[#64748B]">No results found.</li>
            ) : (
              filteredOptions.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      value === opt.id
                        ? "bg-[#e8bc69]/10 font-bold text-[#e8bc69]"
                        : "text-[#CBD5E1] hover:bg-[#0F172A] hover:text-white"
                    }`}
                  >
                    {opt.label}
                    {value === opt.id && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Modal ──────────────────────────────────────────────────
export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  offices,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [officeId, setOfficeId] = useState(offices[0]?.id || "");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [assignable, setAssignable] = useState<Pick<User, "id" | "fullName" | "role">[]>(
    []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api<{ data: Pick<User, "id" | "fullName" | "role">[] }>("/users/assignable")
      .then((res) => setAssignable(res.data))
      .catch(() => setAssignable([]));
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await api("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || undefined,
          categoryId,
          officeId,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          ownerId: ownerId || undefined,
        }),
      });

      // Reset form
      setTitle("");
      setDescription("");
      setDueDate("");
      setOwnerId("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      description="Add a new task to the institutional workflow."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            Task Title *
          </label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Update antivirus on lab PCs"
            className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide additional details..."
            rows={3}
            className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Category *
            </label>
            <SearchableSelect
              required
              options={categories.map((c) => ({ id: c.id, label: c.name }))}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select category"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Office *
            </label>
            <SearchableSelect
              required
              options={offices.map((o) => ({ id: o.id, label: o.name }))}
              value={officeId}
              onChange={setOfficeId}
              placeholder="Select office"
            />
          </div>
        </div>

        {assignable.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Assign to (Officer)
            </label>
            <SearchableSelect
              options={[
                { id: "", label: "Leave unassigned for now" },
                ...assignable.map((u) => ({ id: u.id, label: u.fullName })),
              ]}
              value={ownerId}
              onChange={setOwnerId}
              placeholder="Search and assign..."
            />
            <p className="text-[11px] text-[#94A3B8]">
              Picking an officer assigns the task immediately and notifies them. A due date is then required.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69]"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Due Date {ownerId ? "*" : ""}
            </label>
            <input
              type="date"
              required={!!ownerId}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-white outline-none focus:border-[#e8bc69] [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#94A3B8] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title || !categoryId || !officeId || (!!ownerId && !dueDate)}
            className="rounded-xl bg-[#e8bc69] px-6 py-2.5 text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
