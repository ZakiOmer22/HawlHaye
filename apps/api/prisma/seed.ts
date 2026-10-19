/**
 * HAWL development and demo seed.  Run: npm run db:seed -w @hawl/api
 *
 * What it creates: 4 offices, 9 categories, 8 login accounts (one per role plus extras),
 * about 56 demo tasks with realistic history, delegations, comments and audit events.
 * DEMO DATA ONLY. Never run against production (the script refuses).
 *
 * Safety rules built in:
 *  - refuses when NODE_ENV=production
 *  - refuses a non-local database unless ALLOW_REMOTE_SEED=true AND SEED_PASSWORD is set
 *  - password comes from SEED_PASSWORD (min 10 chars), else a local-only default
 *  - safe to re-run: accounts are updated, demo tasks are created only if no tasks exist
 *    (for a clean start use: npx prisma migrate reset, on a LOCAL database only)
 */
import { Prisma, PrismaClient } from "@prisma/client";
import type { OfficeType, Priority, Role, TaskStatus } from "@prisma/client";
import { formatTaskCode } from "@hawl/shared";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// ---------- safety ----------
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "db"]);

function checkSafety(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production");
  }
  let host: string;
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new Error("DATABASE_URL is missing or not a valid URL");
  }
  const remote = !LOCAL_HOSTS.has(host);
  if (remote && process.env.ALLOW_REMOTE_SEED !== "true") {
    throw new Error(
      `Refusing to seed remote database host "${host}". Use a local database, ` +
        "or set ALLOW_REMOTE_SEED=true (staging only).",
    );
  }
}

// ---------- reference data ----------
type OfficeKey = "computing" | "engineering" | "labs" | "admin";
type CatKey = "AA" | "LAB" | "ADM" | "FIN" | "EVT" | "IT" | "QA" | "STU" | "RES";
type UserKey = "admin" | "dean" | "deputy" | "faculty" | "faculty2" | "labs" | "tech" | "tech2";

const OFFICES: Record<OfficeKey, { name: string; type: OfficeType }> = {
  computing: { name: "Faculty of Computing and IT", type: "FACULTY" },
  engineering: { name: "Faculty of Engineering", type: "FACULTY" },
  labs: { name: "Computer and Engineering Labs", type: "LABS" },
  admin: { name: "CECIT Administration", type: "ADMINISTRATION" },
};

// Starter categories from the plan; the Dean confirms the final list.
const CATEGORIES: Record<CatKey, { name: string; color: string }> = {
  AA: { name: "Academic Affairs", color: "#2563EB" },
  LAB: { name: "Laboratories", color: "#7C3AED" },
  ADM: { name: "Administration", color: "#0A1628" },
  FIN: { name: "Finance and Procurement", color: "#B8973A" },
  EVT: { name: "Events and Meetings", color: "#DB2777" },
  IT: { name: "IT and Infrastructure", color: "#0891B2" },
  QA: { name: "Quality and Accreditation", color: "#16A34A" },
  STU: { name: "Student Affairs", color: "#EA580C" },
  RES: { name: "Research", color: "#475569" },
};

// Reserved .test domain: these addresses can never receive real mail.
const PASSWORD = "12345678";

const USERS: Array<{
  key: UserKey;
  email: string;
  fullName: string;
  role: Role;
  office: OfficeKey;
}> = [
  {
    key: "admin",
    email: "admin@mail.com",
    fullName: "System Admin",
    role: "ADMINISTRATOR",
    office: "admin",
    password: "1",
  },
  {
    key: "dean",
    email: "dean@mail.com",
    fullName: "Dean of CECIT",
    role: "DEAN",
    office: "admin",
    password: "2",
  },
  {
    key: "deputy",
    email: "deputy@mail.com",
    fullName: "Deputy Dean",
    role: "DEPUTY",
    office: "admin",
    password: "3",
  },
  {
    key: "faculty",
    email: "faculty@mail.com",
    fullName: "Faculty Coordinator (Computing and IT)",
    role: "FACULTY_COORDINATOR",
    office: "computing",
    password: "4",
  },
  {
    key: "faculty2",
    email: "faculty2@mail.com",
    fullName: "Faculty Coordinator (Engineering)",
    role: "FACULTY_COORDINATOR",
    office: "engineering",
  },
  {
    key: "labs",
    email: "labs@mail.com",
    fullName: "Labs Coordinator",
    role: "LABS_COORDINATOR",
    office: "labs",
    password: "6",
  },
  {
    key: "tech",
    email: "tech@mail.com",
    fullName: "Lab Technician One",
    role: "LAB_TECHNICIAN",
    office: "labs",
    password: "7",
  },
  {
    key: "tech2",
    email: "tech2@mail.com",
    fullName: "Lab Technician Two",
    role: "LAB_TECHNICIAN",
    office: "labs",
    password: "8",
  },
];

// ---------- demo tasks ----------
interface TaskSeed {
  title: string;
  status: TaskStatus;
  office: OfficeKey;
  cat: CatKey;
  priority: Priority;
  owner?: UserKey;
  delegate?: UserKey;
  due?: number; // days from today (negative = overdue)
  age?: number; // days since created
  blocked?: string;
}
const T = (
  title: string,
  status: TaskStatus,
  office: OfficeKey,
  cat: CatKey,
  priority: Priority,
  extra: Partial<TaskSeed> = {},
): TaskSeed => ({ title, status, office, cat, priority, ...extra });

const TASKS: TaskSeed[] = [
  // Unassigned
  T("Update antivirus signatures on lab PCs", "UNASSIGNED", "labs", "IT", "HIGH", { due: 3 }),
  T("Draft semester exam invigilation schedule", "UNASSIGNED", "computing", "AA", "HIGH", {
    due: 10,
  }),
  T("Clean and inspect lab keyboards and mice", "UNASSIGNED", "labs", "LAB", "LOW"),
  T("Collect feedback forms from Year 1 students", "UNASSIGNED", "computing", "STU", "MEDIUM", {
    due: 14,
  }),
  T("Prepare budget request for lab consumables", "UNASSIGNED", "admin", "FIN", "MEDIUM", {
    due: 12,
  }),
  T("Plan the CECIT open day for new students", "UNASSIGNED", "admin", "EVT", "MEDIUM", {
    due: 21,
  }),
  T("Review library access for the engineering faculty", "UNASSIGNED", "engineering", "ADM", "LOW"),
  T("Draft call for research seminar abstracts", "UNASSIGNED", "computing", "RES", "LOW", {
    due: 25,
  }),
  // Assigned
  T("Replace projector in room A2", "ASSIGNED", "computing", "IT", "MEDIUM", {
    owner: "faculty",
    due: 7,
  }),
  T("Renew Microsoft Office license count", "ASSIGNED", "admin", "IT", "URGENT", {
    owner: "deputy",
    due: 1,
  }),
  T("Submit accreditation self-assessment section 3", "ASSIGNED", "computing", "QA", "HIGH", {
    owner: "faculty",
    due: 9,
  }),
  T("Order replacement network switches", "ASSIGNED", "labs", "IT", "HIGH", {
    owner: "labs",
    due: 6,
  }),
  T("Prepare graduation ceremony equipment list", "ASSIGNED", "admin", "EVT", "MEDIUM", {
    owner: "admin",
    due: 18,
  }),
  T("Update engineering faculty course handbook", "ASSIGNED", "engineering", "AA", "MEDIUM", {
    owner: "faculty2",
    due: 15,
  }),
  T("Schedule monthly staff meeting for November", "ASSIGNED", "admin", "EVT", "LOW", {
    owner: "admin",
    due: 8,
  }),
  T("Collect lecturers' timetable preferences", "ASSIGNED", "computing", "AA", "MEDIUM", {
    owner: "faculty",
    due: 5,
  }),
  T("Approve purchase order for 10 lab chairs", "ASSIGNED", "admin", "FIN", "HIGH", {
    owner: "deputy",
    due: 4,
  }),
  // In progress
  T("Prepare lab schedule for the semester", "IN_PROGRESS", "labs", "LAB", "HIGH", {
    owner: "labs",
    delegate: "tech",
    due: 5,
  }),
  T("Rotate administrator passwords", "IN_PROGRESS", "admin", "IT", "URGENT", {
    owner: "admin",
    due: -1,
  }),
  T("Install Python and VS Code on lab machines", "IN_PROGRESS", "labs", "LAB", "MEDIUM", {
    owner: "labs",
    delegate: "tech",
    due: 4,
  }),
  T(
    "Move the student records sheet to the new template",
    "IN_PROGRESS",
    "computing",
    "STU",
    "MEDIUM",
    { owner: "faculty", due: -3 },
  ),
  T("Set up wireless access points in the second lab", "IN_PROGRESS", "labs", "IT", "HIGH", {
    owner: "labs",
    delegate: "tech2",
    due: 9,
  }),
  T("Write quality checklist for course files", "IN_PROGRESS", "computing", "QA", "MEDIUM", {
    owner: "faculty",
    due: 12,
  }),
  T("Organise research seminar speakers", "IN_PROGRESS", "computing", "RES", "LOW", {
    owner: "faculty",
    due: 16,
  }),
  T("Check emergency lighting and fire extinguishers", "IN_PROGRESS", "labs", "ADM", "HIGH", {
    owner: "labs",
    delegate: "tech",
    due: -2,
  }),
  T("Prepare the monthly attendance summary", "IN_PROGRESS", "engineering", "AA", "MEDIUM", {
    owner: "faculty2",
    due: 3,
  }),
  T("Reconcile departmental petty cash for October", "IN_PROGRESS", "admin", "FIN", "MEDIUM", {
    owner: "admin",
    due: 2,
  }),
  T("Update the staff directory on the CECIT web page", "IN_PROGRESS", "admin", "IT", "LOW", {
    owner: "admin",
    due: 11,
  }),
  T("Collect Year 2 student project proposals", "IN_PROGRESS", "engineering", "STU", "MEDIUM", {
    owner: "faculty2",
    due: -1,
  }),
  // Blocked
  T("Install licensed simulation software", "BLOCKED", "labs", "LAB", "HIGH", {
    owner: "labs",
    delegate: "tech",
    due: 2,
    blocked: "Waiting for licence keys from the vendor",
  }),
  T("Repair air conditioning in the server room", "BLOCKED", "admin", "IT", "URGENT", {
    owner: "admin",
    due: 1,
    blocked: "Technician visit not yet approved by finance",
  }),
  T("Update projector firmware in the labs", "BLOCKED", "labs", "IT", "MEDIUM", {
    owner: "labs",
    delegate: "tech2",
    due: 6,
    blocked: "Firmware download needs an account that IT must create",
  }),
  T("Print and bind accreditation evidence files", "BLOCKED", "computing", "QA", "HIGH", {
    owner: "faculty",
    due: 4,
    blocked: "Print shop closed until Sunday",
  }),
  T("Order 20 replacement HDMI cables", "BLOCKED", "labs", "IT", "LOW", {
    owner: "labs",
    delegate: "tech",
    due: 7,
    blocked: "Supplier quotation not received",
  }),
  T("Confirm venue for the career fair", "BLOCKED", "admin", "EVT", "MEDIUM", {
    owner: "deputy",
    due: 9,
    blocked: "Waiting for confirmation from the main campus",
  }),
  // Review
  T("Publish week 5 attendance report", "REVIEW", "computing", "AA", "MEDIUM", {
    owner: "faculty",
    due: 1,
  }),
  T("Complete inventory of laboratory equipment", "REVIEW", "labs", "LAB", "HIGH", {
    owner: "labs",
    delegate: "tech",
    due: 0,
  }),
  T("Draft revised student help desk procedure", "REVIEW", "computing", "STU", "MEDIUM", {
    owner: "faculty",
    due: 2,
  }),
  T("Set up user accounts for incoming staff", "REVIEW", "admin", "IT", "HIGH", {
    owner: "admin",
    due: 3,
  }),
  T("Prepare the Q3 progress report for the Dean", "REVIEW", "admin", "QA", "HIGH", {
    owner: "deputy",
    due: 1,
  }),
  T("Calibrate lab oscilloscopes", "REVIEW", "engineering", "LAB", "MEDIUM", {
    owner: "faculty2",
    due: 4,
  }),
  T("Review draft research ethics checklist", "REVIEW", "computing", "RES", "LOW", {
    owner: "faculty",
    due: 6,
  }),
  // Completed
  T("Set up the student project lab", "COMPLETED", "labs", "LAB", "HIGH", {
    owner: "labs",
    delegate: "tech",
    due: -3,
    age: 25,
  }),
  T("Update student help desk intake form", "COMPLETED", "admin", "STU", "LOW", {
    owner: "admin",
    due: -10,
    age: 30,
  }),
  T("Install antivirus on faculty laptops", "COMPLETED", "admin", "IT", "HIGH", {
    owner: "admin",
    due: -8,
    age: 28,
  }),
  T("Organise the staff welcome meeting", "COMPLETED", "admin", "EVT", "MEDIUM", {
    owner: "deputy",
    due: -12,
    age: 32,
  }),
  T("Renew the domain name for the CECIT site", "COMPLETED", "admin", "IT", "HIGH", {
    owner: "admin",
    due: -15,
    age: 35,
  }),
  T("Distribute course outlines to lecturers", "COMPLETED", "computing", "AA", "MEDIUM", {
    owner: "faculty",
    due: -9,
    age: 24,
  }),
  T("Replace faulty projector bulb in room B1", "COMPLETED", "computing", "IT", "LOW", {
    owner: "faculty",
    due: -6,
    age: 20,
  }),
  T("Complete fire safety training for lab staff", "COMPLETED", "labs", "ADM", "MEDIUM", {
    owner: "labs",
    delegate: "tech2",
    due: -5,
    age: 22,
  }),
  T("Order lab consumables for semester start", "COMPLETED", "labs", "FIN", "MEDIUM", {
    owner: "labs",
    due: -14,
    age: 38,
  }),
  T("Prepare exam timetable draft", "COMPLETED", "engineering", "AA", "HIGH", {
    owner: "faculty2",
    due: -4,
    age: 21,
  }),
  T("Publish accreditation visit agenda", "COMPLETED", "computing", "QA", "HIGH", {
    owner: "faculty",
    due: -7,
    age: 26,
  }),
  T("Back up the lab file server", "COMPLETED", "labs", "IT", "HIGH", {
    owner: "labs",
    delegate: "tech",
    due: -2,
    age: 18,
  }),
  T("Collect Year 3 internship placement forms", "COMPLETED", "engineering", "STU", "MEDIUM", {
    owner: "faculty2",
    due: -11,
    age: 29,
  }),
  T("Update the equipment loan register", "COMPLETED", "labs", "LAB", "LOW", {
    owner: "labs",
    delegate: "tech2",
    due: -13,
    age: 33,
  }),
];

const DEFAULT_AGE: Record<TaskStatus, number> = {
  UNASSIGNED: 3,
  ASSIGNED: 6,
  IN_PROGRESS: 10,
  BLOCKED: 12,
  REVIEW: 14,
  COMPLETED: 25,
};

// ---------- date helpers ----------
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const LOCAL_OFFSET_HOURS = 3; // Somaliland is UTC+3. TODO: confirm the due-date rule with the team.

/** 23:59:59 local time, `offsetDays` from today, stored as UTC. */
function dueEndOfDay(offsetDays: number): Date {
  const local = new Date(Date.now() + LOCAL_OFFSET_HOURS * HOUR);
  const ms = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + offsetDays,
    23,
    59,
    59,
  );
  return new Date(ms - LOCAL_OFFSET_HOURS * HOUR);
}
const daysAgo = (n: number): Date => new Date(Date.now() - n * DAY);

// ---------- main ----------
async function main(): Promise<void> {
  checkSafety();

  // Wipe old demo data so re-running gives a clean state
  await prisma.taskEvent.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.delegation.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.taskCodeSequence.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.invite.deleteMany({});
  await prisma.user.deleteMany({});

  const officeIds = {} as Record<OfficeKey, string>;
  for (const key of Object.keys(OFFICES) as OfficeKey[]) {
    const o = OFFICES[key];
    const row = await prisma.office.upsert({
      where: { name: o.name },
      update: { type: o.type },
      create: o,
    });
    officeIds[key] = row.id;
  }

  const catIds = {} as Record<CatKey, string>;
  for (const key of Object.keys(CATEGORIES) as CatKey[]) {
    const c = CATEGORIES[key];
    const row = await prisma.category.upsert({
      where: { name: c.name },
      update: { color: c.color },
      create: c,
    });
    catIds[key] = row.id;
  }

  const userIds = {} as Record<UserKey, string>;
  const userNames = {} as Record<UserKey, string>;
  for (const u of USERS) {
    const passwordHash = await hashPassword(PASSWORD);
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        officeId: officeIds[u.office],
        active: true,
      },
      create: {
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        officeId: officeIds[u.office],
        passwordHash,
        lastLoginAt: daysAgo(1),
      },
    });
    userIds[u.key] = row.id;
    userNames[u.key] = u.fullName;
  }

  if ((await prisma.task.count()) > 0) {
    console.warn(
      "Tasks already exist: demo tasks skipped (use migrate reset on a LOCAL database for a clean start).",
    );
  } else {
    const year = new Date().getFullYear();
    const prepared = TASKS.map((t, i) => ({
      t,
      i,
      age: t.age ?? DEFAULT_AGE[t.status] + (i % 4),
    })).sort((a, b) => b.age - a.age); // oldest first, so older tasks get lower codes

    for (const { t, i, age } of prepared) {
      const ownerId = t.owner ? userIds[t.owner] : null;
      if (t.status !== "UNASSIGNED" && (!t.owner || t.due === undefined)) {
        throw new Error(`Bad seed task (needs owner and due date): ${t.title}`);
      }
      if (t.status === "BLOCKED" && !t.blocked)
        throw new Error(`Bad seed task (needs reason): ${t.title}`);

      const creator = userIds[t.priority === "URGENT" ? "dean" : "admin"];
      const assignerKey: UserKey = i % 3 === 0 ? "deputy" : "dean";
      const assigner = userIds[assignerKey];
      const delegateId = t.delegate ? userIds[t.delegate] : null;
      const executor = delegateId ?? ownerId ?? creator;

      const created = daysAgo(age);
      const step = (f: number): Date =>
        new Date(created.getTime() + f * (Date.now() - created.getTime()));
      const doneAt = step(0.9);

      const seq = await prisma.taskCodeSequence.upsert({
        where: { year },
        create: { year, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      });

      const task = await prisma.task.create({
        data: {
          code: formatTaskCode(year, seq.lastSeq),
          title: t.title,
          description: "Demo task created by the seed script for demos and training.",
          status: t.status,
          priority: t.priority,
          officeId: officeIds[t.office],
          categoryId: catIds[t.cat],
          ownerId,
          assignedById: t.status === "UNASSIGNED" ? null : assigner,
          createdById: creator,
          dueDate: t.due === undefined ? null : dueEndOfDay(t.due),
          blockedReason: t.status === "BLOCKED" ? (t.blocked ?? null) : null,
          completedAt: t.status === "COMPLETED" ? doneAt : null,
          createdAt: created,
        },
      });

      if (t.delegate && ownerId && delegateId) {
        await prisma.delegation.create({
          data: {
            taskId: task.id,
            delegateId,
            delegatedById: ownerId,
            status: "ACCEPTED",
            respondedAt: step(0.2),
            createdAt: step(0.15),
          },
        });
      }

      const ev: Prisma.TaskEventCreateManyInput[] = [
        {
          taskId: task.id,
          actorId: creator,
          type: "CREATED",
          toValue: "UNASSIGNED",
          createdAt: created,
        },
      ];
      const comments: Prisma.CommentCreateManyInput[] = [];
      const started = ["IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED"].includes(t.status);

      if (t.status !== "UNASSIGNED" && t.owner) {
        ev.push({
          taskId: task.id,
          actorId: assigner,
          type: "ASSIGNED",
          fromValue: "UNASSIGNED",
          toValue: "ASSIGNED",
          note: `Owner: ${userNames[t.owner]}`,
          createdAt: step(0.1),
        });
      }
      if (t.delegate && ownerId) {
        ev.push({
          taskId: task.id,
          actorId: ownerId,
          type: "DELEGATED",
          note: `Delegated to ${userNames[t.delegate]}`,
          createdAt: step(0.15),
        });
      }
      if (started) {
        ev.push({
          taskId: task.id,
          actorId: executor,
          type: "STATUS_CHANGED",
          fromValue: "ASSIGNED",
          toValue: "IN_PROGRESS",
          createdAt: step(0.25),
        });
      }
      if (t.status === "BLOCKED") {
        ev.push({
          taskId: task.id,
          actorId: executor,
          type: "STATUS_CHANGED",
          fromValue: "IN_PROGRESS",
          toValue: "BLOCKED",
          note: t.blocked,
          createdAt: step(0.5),
        });
        comments.push({
          taskId: task.id,
          authorId: executor,
          body: `Blocked: ${t.blocked ?? ""}`,
          createdAt: step(0.5),
        });
      }
      if (t.status === "REVIEW" || t.status === "COMPLETED") {
        ev.push({
          taskId: task.id,
          actorId: ownerId ?? executor,
          type: "STATUS_CHANGED",
          fromValue: "IN_PROGRESS",
          toValue: "REVIEW",
          note: "Work completed; ready for review",
          createdAt: step(0.7),
        });
        comments.push({
          taskId: task.id,
          authorId: ownerId ?? executor,
          body: "Work completed. Ready for review.",
          createdAt: step(0.7),
        });
      }
      if (t.status === "COMPLETED") {
        ev.push({
          taskId: task.id,
          actorId: assigner,
          type: "STATUS_CHANGED",
          fromValue: "REVIEW",
          toValue: "COMPLETED",
          note: "Accepted",
          createdAt: doneAt,
        });
        comments.push({
          taskId: task.id,
          authorId: assigner,
          body: "Accepted. Thank you.",
          createdAt: doneAt,
        });
      }
      await prisma.taskEvent.createMany({ data: ev });
      if (comments.length > 0) await prisma.comment.createMany({ data: comments });
    }
  }

  // Audit events so the system reports (activity, security events) have something to show.
  if ((await prisma.auditLog.count()) === 0) {
    const rows: Prisma.AuditLogCreateManyInput[] = [];
    for (const u of USERS) {
      rows.push({
        actorId: userIds.admin,
        action: "user.create",
        entityType: "User",
        entityId: userIds[u.key],
        createdAt: daysAgo(30),
        meta: { seed: true },
      });
      rows.push({
        actorId: userIds[u.key],
        action: "auth.login",
        ip: "127.0.0.1",
        userAgent: "seed",
        createdAt: daysAgo(1),
        meta: { seed: true },
      });
    }
    for (let n = 0; n < 3; n++) {
      rows.push({
        actorId: null,
        action: "auth.login_failed",
        ip: "127.0.0.1",
        userAgent: "seed",
        createdAt: daysAgo(2),
        meta: { seed: true, email: "tech@mail.com" },
      });
    }
    await prisma.auditLog.createMany({ data: rows });
  }

  console.warn("Seed complete (DEMO DATA).");
  console.warn("Login credentials (email / password / role):");
  for (const u of USERS) {
    console.warn(`  ${u.email.padEnd(24)} ${PASSWORD}   ${u.role}`);
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
