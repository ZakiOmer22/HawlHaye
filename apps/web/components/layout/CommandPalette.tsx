"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Search, Loader2, FileText, User as UserIcon, Building2 } from "lucide-react";

type SearchResult = {
  tasks: { id: string; code: string; title: string; status: string }[];
  users: { id: string; fullName: string; email: string; role: string }[];
  offices: { id: string; name: string; type: string }[];
};

export function CommandPalette({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  // Debounced API call
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ data: SearchResult }>(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  if (!open) return null;

  const hasResults =
    results && (results.tasks.length > 0 || results.users.length > 0 || results.offices.length > 0);

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-[#1E293B] rounded-2xl shadow-2xl border border-[#334155] overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-4 sm:mx-0">
        <div className="flex items-center px-4 border-b border-[#334155]">
          <Search className="h-5 w-5 text-[#94A3B8] mr-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, users, or offices..."
            className="flex-1 bg-transparent py-4 text-white placeholder-[#64748B] outline-none text-base sm:text-lg"
          />
          {loading && <Loader2 className="h-5 w-5 animate-spin text-[#e8bc69]" />}
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-[#334155] bg-[#0F172A] px-2 font-mono text-[10px] font-bold text-[#94A3B8] ml-2">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!results && query.length >= 2 && !loading && (
            <div className="p-8 text-center text-sm text-[#94A3B8]">No results found.</div>
          )}
          {!results && query.length < 2 && (
            <div className="p-8 text-center text-sm text-[#94A3B8]">
              Type at least 2 characters to search...
            </div>
          )}

          {hasResults && (
            <div className="space-y-4">
              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <h3 className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                    Tasks
                  </h3>
                  {results.tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleNavigate(`/tasks/${t.id}`)}
                      className="flex items-center w-full px-3 py-3 rounded-xl hover:bg-[#334155] transition text-left group"
                    >
                      <FileText className="h-4 w-4 text-[#e8bc69] mr-3 shrink-0" />
                      <span className="flex-1 truncate text-sm text-white group-hover:text-[#e8bc69]">
                        {t.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#64748B] ml-2">{t.code}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Users */}
              {results.users.length > 0 && (
                <div>
                  <h3 className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                    Users
                  </h3>
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleNavigate(`/admin/users?search=${u.email}`)}
                      className="flex items-center w-full px-3 py-3 rounded-xl hover:bg-[#334155] transition text-left group"
                    >
                      <UserIcon className="h-4 w-4 text-blue-400 mr-3 shrink-0" />
                      <div className="flex-1 truncate">
                        <span className="text-sm text-white group-hover:text-[#e8bc69]">
                          {u.fullName}
                        </span>
                        <span className="text-xs text-[#94A3B8] ml-2">{u.email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Offices */}
              {results.offices.length > 0 && (
                <div>
                  <h3 className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                    Offices
                  </h3>
                  {results.offices.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleNavigate(`/admin/offices?search=${o.name}`)}
                      className="flex items-center w-full px-3 py-3 rounded-xl hover:bg-[#334155] transition text-left group"
                    >
                      <Building2 className="h-4 w-4 text-violet-400 mr-3 shrink-0" />
                      <span className="flex-1 truncate text-sm text-white group-hover:text-[#e8bc69]">
                        {o.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-[#64748B] ml-2">
                        {o.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
