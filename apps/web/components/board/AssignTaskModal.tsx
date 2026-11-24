"use client";

import { useState, useEffect, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Loader2, Search, ChevronDown, Check, User as UserIcon } from "lucide-react";
import type { User, Task } from "@/lib/types";

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: Task | null;
}

const ROLE_LABEL: Record<string, string> = {
  DEAN: "Dean",
  DEPUTY: "Deputy",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  LABS_COORDINATOR: "Labs Coordinator",
  ADMINISTRATOR: "Administrator",
  LAB_TECHNICIAN: "Lab Technician",
};

export function AssignTaskModal({ isOpen, onClose, onSuccess, task }: AssignTaskModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  // Search Combobox State
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api<{ data: User[] }>("/users/assignable")
        // FIXED: Removed the .filter(u => u.active) to satisfy TypeScript
        .then((res) => setUsers(res.data))
        .catch(() => setError("Failed to load users"))
        .finally(() => setLoading(false));

      setOwnerId(task?.ownerId || "");
      setDueDate(task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
      setPriority(task?.priority || "MEDIUM");
      setError(null);
      setSearchQuery("");
      setIsDropdownOpen(false);
    }
  }, [isOpen, task]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedUser = users.find((u) => u.id === ownerId);

  // Filter users based on search query (matches name OR role)
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || ROLE_LABEL[u.role]?.toLowerCase().includes(q);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    if (!ownerId || !dueDate) {
      setError("You must select an owner and a due date.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await api(`/tasks/${task.id}/assign`, {
        method: "POST",
        body: JSON.stringify({
          ownerId,
          dueDate: new Date(dueDate).toISOString(),
          priority,
        }),
      });
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "forbidden") {
        setError(
          "You do not have permission to assign this task. You can only assign work to people in your own reporting line.",
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to assign task");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Task"
      description={`To move "${task?.title}" to Assigned, you must select an owner and a due date.`}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-400">
              {error}
            </div>
          )}

          {/* Searchable Combobox */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Assign to (Owner)
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-app py-2.5 px-4 text-sm text-primary outline-none transition focus:border-accent"
              >
                {selectedUser ? (
                  <span className="flex items-center gap-2">
                    <UserIcon size={14} className="text-accent" />
                    <span className="font-bold">{selectedUser.fullName}</span>
                    <span className="text-xs text-muted">
                      ({ROLE_LABEL[selectedUser.role] || selectedUser.role})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted">Select a user...</span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-muted transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-border bg-panel shadow-2xl animate-in fade-in slide-in-from-top-1">
                  <div className="border-b border-border p-2">
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search by name or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-border bg-app py-2 ps-9 pe-3 text-sm text-primary outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48 p-1">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted">
                        No users found matching "{searchQuery}"
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setOwnerId(u.id);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition hover:bg-app"
                        >
                          <div>
                            <p className="font-bold text-primary">{u.fullName}</p>
                            <p className="text-xs text-muted">{ROLE_LABEL[u.role] || u.role}</p>
                          </div>
                          {ownerId === u.id && <Check size={16} className="text-accent" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Due Date
              </label>
              <input
                required
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
                }
                className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none transition focus:border-accent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-bold text-muted hover:text-primary"
            >
              Cancel
            </button>
            <button
              disabled={busy || !ownerId || !dueDate}
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text transition hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : "Assign Task"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
