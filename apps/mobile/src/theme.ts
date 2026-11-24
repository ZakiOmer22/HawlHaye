// Design tokens copied 1:1 from apps/web/app/globals.css (+ Tailwind palette values the web pages use).
import type { Priority, TaskStatus } from "./api/types";

export type ThemeName = "dark" | "light";

const dark = {
  app: "#0F172A", appSoft: "#0B132B", panel: "#1E293B", panelHover: "#273449",
  border: "#334155", borderStrong: "#475569",
  primary: "#F8FAFC", secondary: "#CBD5E1", muted: "#94A3B8", faint: "#64748B",
  accent: "#E8BC69", accentHover: "#F1CF8B", accentText: "#0F172A",
};
const light: typeof dark = {
  app: "#F1F5F9", appSoft: "#E2E8F0", panel: "#FFFFFF", panelHover: "#F8FAFC",
  border: "#E2E8F0", borderStrong: "#CBD5E1",
  primary: "#0F172A", secondary: "#334155", muted: "#64748B", faint: "#94A3B8",
  accent: "#B8850F", accentHover: "#A06F00", accentText: "#FFFFFF",
};

export interface Palette {
  app: string; appSoft: string; panel: string; panelHover: string; border: string; borderStrong: string;
  primary: string; secondary: string; muted: string; faint: string;
  accent: string; accentHover: string; accentText: string;
  // Tailwind colours used by web pages
  red: string; redSoft: string; emerald: string; amber: string; blue: string; violet: string; slate: string;
  // aliases so older screens keep working
  bg: string; panelAlt: string; text: string; danger: string; ok: string; warn: string; info: string;
}

export function paletteFor(theme: ThemeName): Palette {
  const b = theme === "light" ? light : dark;
  const light_ = theme === "light";
  return {
    ...b,
    red: light_ ? "#DC2626" : "#F87171", redSoft: "#EF4444",
    emerald: light_ ? "#059669" : "#34D399", amber: light_ ? "#D97706" : "#FBBF24",
    blue: light_ ? "#2563EB" : "#60A5FA", violet: light_ ? "#7C3AED" : "#A78BFA", slate: "#94A3B8",
    bg: b.app, panelAlt: b.app, text: b.primary,
    danger: light_ ? "#DC2626" : "#F87171", ok: light_ ? "#059669" : "#34D399",
    warn: light_ ? "#D97706" : "#FBBF24", info: light_ ? "#2563EB" : "#60A5FA",
  };
}

/** "#RRGGBB" + alpha → rgba() string (Tailwind's `bg-red-500/10`). */
export function alpha(hex: string, a: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)},${a})`;
}

/** Status styling from board/page.tsx STATUS_STYLE (text uses the -500 shades). */
export function statusStyle(s: TaskStatus, c: Palette) {
  const map: Record<TaskStatus, { dot: string; text: string }> = {
    UNASSIGNED: { dot: "#94A3B8", text: "#64748B" },
    ASSIGNED: { dot: "#60A5FA", text: "#3B82F6" },
    IN_PROGRESS: { dot: c.accent, text: c.accent },
    BLOCKED: { dot: "#F87171", text: "#EF4444" },
    REVIEW: { dot: "#A78BFA", text: "#8B5CF6" },
    COMPLETED: { dot: "#34D399", text: "#10B981" },
  };
  const m = map[s];
  return { dot: m.dot, text: m.text, bg: alpha(m.text, 0.1), border: alpha(m.text, 0.2) };
}

/** Priority pill colours from layout/TaskCard.tsx PRIORITY_STYLES. */
export function priorityStyle(p: Priority) {
  const col: Record<Priority, string> = { LOW: "#94A3B8", MEDIUM: "#60A5FA", HIGH: "#FBBF24", URGENT: "#F87171" };
  const c = col[p];
  return { text: c, bg: alpha(c === "#94A3B8" ? "#64748B" : c, 0.1), border: alpha(c === "#94A3B8" ? "#64748B" : c, 0.2) };
}

// Plus Jakarta Sans — same family the web loads through next/font.
export const FONT: Record<string, string> = {
  "400": "PlusJakartaSans_400Regular",
  "500": "PlusJakartaSans_500Medium",
  "600": "PlusJakartaSans_600SemiBold",
  "700": "PlusJakartaSans_700Bold",
  "800": "PlusJakartaSans_800ExtraBold",
  "900": "PlusJakartaSans_800ExtraBold",
};

// compat for older screens
export const STATUS_COLOR: Record<TaskStatus, string> = {
  UNASSIGNED: "#94A3B8", ASSIGNED: "#60A5FA", IN_PROGRESS: "#E8BC69", BLOCKED: "#F87171", REVIEW: "#A78BFA", COMPLETED: "#34D399",
};
export const PRIORITY_COLOR: Record<Priority, string> = { LOW: "#94A3B8", MEDIUM: "#60A5FA", HIGH: "#FBBF24", URGENT: "#F87171" };
