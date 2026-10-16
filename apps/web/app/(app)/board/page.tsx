import { STATUS_LABELS, TASK_STATUSES } from "@hawl/shared";

// TODO (Maxamed Omer, Day 3): real Kanban board. Columns come from the shared package so UI and API agree.
export default function BoardPage() {
  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold text-navy">Board</h1>
      <div className="flex gap-3 overflow-x-auto">
        {TASK_STATUSES.map((s) => (
          <section
            key={s}
            className="min-w-[16rem] rounded-lg border border-slate-200 bg-white p-3"
          >
            <h2 className="text-sm font-semibold text-navy">{STATUS_LABELS[s]}</h2>
          </section>
        ))}
      </div>
    </main>
  );
}
