// apps/api/src/modules/daily-reports/routes.ts
// Daily academic report for coordinators. Due every day at 19:00 (Hargeisa time, EAT = UTC+3, no DST),
// except Fridays. Dean/Deputy can see who has submitted, who is late and who is missing.
import { Router } from "express";
import { dailyReportSchema } from "@hawl/shared";
import { prisma } from "../../lib/prisma";
import { writeAudit } from "../../lib/audit";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { HttpError } from "../../middleware/errors";

export const dailyReportsRouter = Router();
dailyReportsRouter.use(requireAuth);

const TZ = "Africa/Mogadishu"; // UTC+3 year-round, same as Hargeisa
const UTC_OFFSET_HOURS = 3;
const DUE_HOUR_LOCAL = 19;
const SUBMITTERS = ["FACULTY_COORDINATOR", "LABS_COORDINATOR"] as const;

/** YYYY-MM-DD for the given instant in Hargeisa time. */
function localDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function isFriday(dateStr: string): boolean {
  // Noon UTC avoids any day-boundary surprises when reading the weekday.
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay() === 5;
}

/** 19:00 local on dateStr, expressed as a UTC instant. */
function deadlineFor(dateStr: string): Date {
  return new Date(`${dateStr}T${String(DUE_HOUR_LOCAL - UTC_OFFSET_HOURS).padStart(2, "0")}:00:00Z`);
}

function validDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// My report for today + recent history
dailyReportsRouter.get(
  "/me",
  requireRole(...SUBMITTERS),
  asyncHandler(async (req, res) => {
    const today = localDate(new Date());
    const history = await prisma.dailyReport.findMany({
      where: { authorId: req.user!.id },
      orderBy: { reportDate: "desc" },
      take: 14,
    });
    res.json({
      data: {
        today,
        requiredToday: !isFriday(today),
        deadline: deadlineFor(today).toISOString(),
        report: history.find((r) => r.reportDate === today) ?? null,
        history,
      },
    });
  }),
);

// Create / update today's report (editable until the day ends; edits after 19:00 stay flagged late)
dailyReportsRouter.put(
  "/me",
  requireRole(...SUBMITTERS),
  asyncHandler(async (req, res) => {
    const input = dailyReportSchema.parse(req.body);
    const now = new Date();
    const today = localDate(now);
    const existing = await prisma.dailyReport.findUnique({
      where: { authorId_reportDate: { authorId: req.user!.id, reportDate: today } },
    });
    // Lateness is decided by the first submission; later edits cannot "un-late" a report.
    const late = existing ? existing.late : !isFriday(today) && now > deadlineFor(today);

    const report = await prisma.dailyReport.upsert({
      where: { authorId_reportDate: { authorId: req.user!.id, reportDate: today } },
      create: { authorId: req.user!.id, reportDate: today, body: input.body, late },
      update: { body: input.body },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: existing ? "daily_report.updated" : "daily_report.submitted",
      entityType: "DailyReport",
      entityId: report.id,
      meta: { reportDate: today, late },
      req,
    });
    res.status(existing ? 200 : 201).json({ data: report });
  }),
);

// Dean / Deputy: status of every coordinator for a given day (default today)
dailyReportsRouter.get(
  "/",
  requireRole("DEAN", "DEPUTY"),
  asyncHandler(async (req, res) => {
    const date = req.query.date === undefined ? localDate(new Date()) : req.query.date;
    if (!validDate(date)) throw new HttpError(400, "date must be YYYY-MM-DD", "invalid_request");

    const coordinators = await prisma.user.findMany({
      where: { active: true, role: { in: [...SUBMITTERS] } },
      select: { id: true, fullName: true, role: true, office: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });
    const reports = await prisma.dailyReport.findMany({ where: { reportDate: date } });
    const byAuthor = new Map(reports.map((r) => [r.authorId, r]));
    const required = !isFriday(date);

    res.json({
      data: {
        date,
        required,
        deadline: deadlineFor(date).toISOString(),
        coordinators: coordinators.map((c) => {
          const r = byAuthor.get(c.id) ?? null;
          return {
            ...c,
            status: r ? (r.late ? "LATE" : "SUBMITTED") : required ? "MISSING" : "NOT_REQUIRED",
            report: r,
          };
        }),
      },
    });
  }),
);
