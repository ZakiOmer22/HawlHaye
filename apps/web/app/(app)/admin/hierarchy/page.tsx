"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { AlertCircle, CheckCircle2, Loader2, Network } from "lucide-react";

type Row = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  supervisorId: string | null;
  coordinatorLinks: { coordinatorId: string }[];
};

const COORDINATOR_ROLES = ["FACULTY_COORDINATOR", "LABS_COORDINATOR"];

/** Reporting lines: who each Lab Technician reports to, and which coordinators each Administrator works for. */
export default function ReportingLinesPage() {
  const [users, setUsers] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ data: Row[] }>("/users");
      setUsers(res.data);
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403
          ? "Only the Dean, Deputy or system administrator can set reporting lines."
          : "Could not load users.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const coordinators = useMemo(
    () => (users ?? []).filter((u) => COORDINATOR_ROLES.includes(u.role)),
    [users],
  );
  const technicians = useMemo(
    () => (users ?? []).filter((u) => u.role === "LAB_TECHNICIAN"),
    [users],
  );
  const administrators = useMemo(
    () => (users ?? []).filter((u) => u.role === "ADMINISTRATOR"),
    [users],
  );

  async function save(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setSaved(null);
    setError(null);
    try {
      await api(`/users/${id}/hierarchy`, { method: "PATCH", body: JSON.stringify(body) });
      setSaved(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!users && !error) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <header>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-accent">
          <Network size={14} /> Admin
        </p>
        <h1 className="mt-1 text-3xl font-black text-primary">Reporting Lines</h1>
        <p className="mt-1 text-sm text-muted">
          Coordinators see the tasks of the people who report to them. Set the lines here.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-400"
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {users && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted">
              Lab Technicians report to
            </h2>
            {technicians.length === 0 && (
              <p className="text-sm text-muted">No Lab Technicians yet.</p>
            )}
            {technicians.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-panel p-4"
              >
                <div>
                  <p className="font-bold text-primary">{u.fullName}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {saved === u.id && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  <select
                    aria-label={`Supervisor for ${u.fullName}`}
                    value={u.supervisorId ?? ""}
                    disabled={busy === u.id}
                    onChange={(e) => void save(u.id, { supervisorId: e.target.value || null })}
                    className="rounded-xl border border-border bg-app px-3 py-2 text-sm text-primary outline-none focus:border-accent"
                  >
                    <option value="">No supervisor</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted">
              Administrators work for
            </h2>
            {administrators.length === 0 && (
              <p className="text-sm text-muted">No Administrators yet.</p>
            )}
            {administrators.map((u) => {
              const linked = new Set(u.coordinatorLinks.map((l) => l.coordinatorId));
              return (
                <div key={u.id} className="space-y-3 rounded-2xl border border-border bg-panel p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary">{u.fullName}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                    {saved === u.id && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {coordinators.map((c) => {
                      const on = linked.has(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={busy === u.id}
                          aria-pressed={on}
                          onClick={() => {
                            const next = new Set(linked);
                            if (on) next.delete(c.id);
                            else next.add(c.id);
                            void save(u.id, { coordinatorIds: [...next] });
                          }}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                            on
                              ? "border-accent bg-accent text-accent-text"
                              : "border-border bg-app text-muted hover:text-primary"
                          }`}
                        >
                          {c.fullName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
