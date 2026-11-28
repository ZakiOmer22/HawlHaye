// Same formatting as apps/web/lib/format.ts (en-GB).
import type { Task } from "../api/types";

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "COMPLETED") return false;
  return new Date(dueDate).getTime() < Date.now();
}
// legacy names used by older screens
export const fmtDate = formatDate;
export const fmtDateTime = (iso: string) => formatDateTime(iso);
export const isOverdueTask = (t: Pick<Task, "dueDate" | "status">) =>
  isOverdue(t.dueDate, t.status);
export function dueLabel(t: Pick<Task, "dueDate" | "status">): string {
  if (!t.dueDate) return "—";
  return formatDate(t.dueDate);
}
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
export function toIsoDate(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(ymd);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
export function ymdFromNow(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
