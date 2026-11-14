// apps/api/src/modules/reports/uptime.ts
// UptimeRobot proxy. Modes:
//   "data" - full monitor data (requires UPTIMEROBOT_API_KEY)
//   "link" - only a status page URL is configured; frontend shows a clean card + button
//   "none" - nothing configured; frontend shows a friendly "not set up" card

export type UptimeMonitor = {
  id: number;
  name: string;
  url: string | null;
  status: "up" | "down" | "paused" | "unknown";
  uptime: { day: number | null; week: number | null; month: number | null };
  avgResponseMs: number | null;
  lastDownAt: string | null;
};

export type UptimeReport = {
  mode: "data" | "link" | "none";
  statusPageUrl: string | null;
  overall: {
    uptime30d: number | null;
    monitorsDown: number;
    totalMonitors: number;
    avgResponseMs: number | null;
  } | null;
  monitors: UptimeMonitor[];
  generatedAt: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: UptimeReport } | null = null;

const STATUS_MAP: Record<number, UptimeMonitor["status"]> = {
  0: "paused",
  1: "unknown",
  2: "up",
  8: "down",
  9: "down",
};

function toNumberOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

async function fetchFromApi(apiKey: string): Promise<{
  overall: UptimeReport["overall"];
  monitors: UptimeMonitor[];
}> {
  const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify({
      api_key: apiKey,
      format: "json",
      custom_uptime_ratios: "1-7-30",
      response_times: 1,
      response_times_average: 1,
      logs: 1,
      log_types: "1-2",
      logs_limit: 5,
    }),
  });

  if (!res.ok) throw new Error(`UptimeRobot ${res.status}`);
  const json = (await res.json()) as { stat: string; monitors?: Array<Record<string, unknown>> };
  if (json.stat !== "ok" || !Array.isArray(json.monitors)) {
    throw new Error("UptimeRobot payload invalid");
  }

  const monitors: UptimeMonitor[] = json.monitors.map((m) => {
    const ratios = String(m.custom_uptime_ratios ?? "")
      .split("-")
      .map((v) => toNumberOrNull(v));
    const logs = Array.isArray(m.logs) ? (m.logs as Array<Record<string, unknown>>) : [];
    const lastDown = logs.find((l) => Number(l.type) === 1);
    const responseTimes = Array.isArray(m.response_times)
      ? (m.response_times as Array<Record<string, unknown>>)
      : [];
    const avg =
      toNumberOrNull(m.average_response_time) ??
      (responseTimes.length
        ? responseTimes.reduce((s, r) => s + (toNumberOrNull(r.value) ?? 0), 0) /
          responseTimes.length
        : null);

    return {
      id: Number(m.id),
      name: String(m.friendly_name ?? `Monitor ${m.id}`),
      url: typeof m.url === "string" ? m.url : null,
      status: STATUS_MAP[Number(m.status)] ?? "unknown",
      uptime: { day: ratios[0] ?? null, week: ratios[1] ?? null, month: ratios[2] ?? null },
      avgResponseMs: avg != null ? Math.round(avg) : null,
      lastDownAt: typeof lastDown?.datetime === "string" ? lastDown.datetime : null,
    };
  });

  const monthValues = monitors.map((m) => m.uptime.month).filter((v): v is number => v != null);
  const responseValues = monitors.map((m) => m.avgResponseMs).filter((v): v is number => v != null);

  return {
    monitors,
    overall: {
      uptime30d: monthValues.length
        ? monthValues.reduce((s, v) => s + v, 0) / monthValues.length
        : null,
      monitorsDown: monitors.filter((m) => m.status === "down").length,
      totalMonitors: monitors.length,
      avgResponseMs: responseValues.length
        ? Math.round(responseValues.reduce((s, v) => s + v, 0) / responseValues.length)
        : null,
    },
  };
}

export async function getUptimeReport(): Promise<UptimeReport> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY?.trim();
  const statusPageUrl = process.env.UPTIMEROBOT_STATUS_PAGE_URL?.trim() ?? null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const now = new Date().toISOString();

  if (apiKey) {
    try {
      const { overall, monitors } = await fetchFromApi(apiKey);
      const report: UptimeReport = {
        mode: "data",
        statusPageUrl,
        overall,
        monitors,
        generatedAt: now,
      };
      cache = { at: Date.now(), data: report };
      return report;
    } catch {
      if (statusPageUrl) {
        const report: UptimeReport = {
          mode: "link",
          statusPageUrl,
          overall: null,
          monitors: [],
          generatedAt: now,
        };
        cache = { at: Date.now(), data: report };
        return report;
      }
      const report: UptimeReport = {
        mode: "none",
        statusPageUrl: null,
        overall: null,
        monitors: [],
        generatedAt: now,
      };
      cache = { at: Date.now(), data: report };
      return report;
    }
  }

  if (statusPageUrl) {
    const report: UptimeReport = {
      mode: "link",
      statusPageUrl,
      overall: null,
      monitors: [],
      generatedAt: now,
    };
    cache = { at: Date.now(), data: report };
    return report;
  }

  const report: UptimeReport = {
    mode: "none",
    statusPageUrl: null,
    overall: null,
    monitors: [],
    generatedAt: now,
  };
  cache = { at: Date.now(), data: report };
  return report;
}
