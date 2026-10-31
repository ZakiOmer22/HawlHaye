/// <reference types="node" />
/**
 * HAWL development and demo seed.  Run: npm run db:seed -w @hawl/api
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

const PASSWORD = "12345678";

const USERS: Array<{
  key: UserKey;
  email: string;
  fullName: string;
  role: Role;
  office: OfficeKey;
  password: string;
}> = [
  { key: "admin", email: "admin@mail.com", fullName: "System Admin", role: "ADMINISTRATOR", office: "admin", password: "12345678" },
  { key: "dean", email: "dean@mail.com", fullName: "Dean of CECIT", role: "DEAN", office: "admin", password: "12345678" },
  { key: "deputy", email: "deputy@mail.com", fullName: "Deputy Dean", role: "DEPUTY", office: "admin", password: "12345678" },
  { key: "faculty", email: "faculty@mail.com", fullName: "Faculty Coordinator (Computing and IT)", role: "FACULTY_COORDINATOR", office: "computing", password: "12345678" },
  { key: "faculty2", email: "faculty2@mail.com", fullName: "Faculty Coordinator (Engineering)", role: "FACULTY_COORDINATOR", office: "engineering", password: "12345678" },
  { key: "labs", email: "labs@mail.com", fullName: "Labs Coordinator", role: "LABS_COORDINATOR", office: "labs", password: "12345678" },
  { key: "tech", email: "tech@mail.com", fullName: "Lab Technician One", role: "LAB_TECHNICIAN", office: "labs", password: "12345678" },
  { key: "tech2", email: "tech2@mail.com", fullName: "Lab Technician Two", role: "LAB_TECHNICIAN", office: "labs", password: "12345678" },
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
  due?: number;
  age?: number;
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
  T("Update antivirus signatures on lab PCs", "UNASSIGNED", "labs", "IT", "HIGH", { due: 3 }),
  T("Draft semester exam invigilation schedule", "UNASSIGNED", "computing", "AA", "HIGH", { due: 10 }),
  T("Clean and inspect lab keyboards and mice", "UNASSIGNED", "labs", "LAB", "LOW"),
  T("Collect feedback forms from Year 1 students", "UNASSIGNED", "computing", "STU", "MEDIUM", { due: 14 }),
  T("Prepare budget request for lab consumables", "UNASSIGNED", "admin", "FIN", "MEDIUM", { due: 12 }),
  T("Plan the CECIT open day for new students", "UNASSIGNED", "admin", "EVT", "MEDIUM", { due: 21 }),
  T("Review library access for the engineering faculty", "UNASSIGNED", "engineering", "ADM", "LOW"),
  T("Draft call for research seminar abstracts", "UNASSIGNED", "computing", "RES", "LOW", { due: 25 }),
  T("Replace projector in room A2", "ASSIGNED", "computing", "IT", "MEDIUM", { owner: "faculty", due: 7 }),
  T("Renew Microsoft Office license count", "ASSIGNED", "admin", "IT", "URGENT", { owner: "deputy", due: 1 }),
  T("Submit accreditation self-assessment section 3", "ASSIGNED", "computing", "QA", "HIGH", { owner: "faculty", due: 9 }),
  T("Order replacement network switches", "ASSIGNED", "labs", "IT", "HIGH", { owner: "labs", due: 6 }),
  T("Prepare graduation ceremony equipment list", "ASSIGNED", "admin", "EVT", "MEDIUM", { owner: "admin", due: 18 }),
  T("Update engineering faculty course handbook", "ASSIGNED", "engineering", "AA", "MEDIUM", { owner: "faculty2", due: 15 }),
  T("Schedule monthly staff meeting for November", "ASSIGNED", "admin", "EVT", "LOW", { owner: "admin", due: 8 }),
  T("Collect lecturers' timetable preferences", "ASSIGNED", "computing", "AA", "MEDIUM", { owner: "faculty", due: 5 }),
  T("Approve purchase order for 10 lab chairs", "ASSIGNED", "admin", "FIN", "HIGH", { owner: "deputy", due: 4 }),
  T("Prepare lab schedule for the semester", "IN_PROGRESS", "labs", "LAB", "HIGH", { owner: "labs", delegate: "tech", due: 5 }),
  T("Rotate administrator passwords", "IN_PROGRESS", "admin", "IT", "URGENT", { owner: "admin", due: -1 }),
  T("Install Python and VS Code on lab machines", "IN_PROGRESS", "labs", "LAB", "MEDIUM", { owner: "labs", delegate: "tech", due: 4 }),
  T("Move the student records sheet to the new template", "IN_PROGRESS", "computing", "STU", "MEDIUM", { owner: "faculty", due: -3 }),
  T("Set up wireless access points in the second lab", "IN_PROGRESS", "labs", "IT", "HIGH", { owner: "labs", delegate: "tech2", due: 9 }),
  T("Write quality checklist for course files", "IN_PROGRESS", "computing", "QA", "MEDIUM", { owner: "faculty", due: 12 }),
  T("Organise research seminar speakers", "IN_PROGRESS", "computing", "RES", "LOW", { owner: "faculty", due: 16 }),
  T("Check emergency lighting and fire extinguishers", "IN_PROGRESS", "labs", "ADM", "HIGH", { owner: "labs", delegate: "tech", due: -2 }),
  T("Prepare the monthly attendance summary", "IN_PROGRESS", "engineering", "AA", "MEDIUM", { owner: "faculty2", due: 3 }),
  T("Reconcile departmental petty cash for October", "IN_PROGRESS", "admin", "FIN", "MEDIUM", { owner: "admin", due: 2 }),
  T("Update the staff directory on the CECIT web page", "IN_PROGRESS", "admin", "IT", "LOW", { owner: "admin", due: 11 }),
  T("Collect Year 2 student project proposals", "IN_PROGRESS", "engineering", "STU", "MEDIUM", { owner: "faculty2", due: -1 }),
  T("Install licensed simulation software", "BLOCKED", "labs", "LAB", "HIGH", { owner: "labs", delegate: "tech", due: 2, blocked: "Waiting for licence keys from the vendor" }),
  T("Repair air conditioning in the server room", "BLOCKED", "admin", "IT", "URGENT", { owner: "admin", due: 1, blocked: "Technician visit not yet approved by finance" }),
  T("Update projector firmware in the labs", "BLOCKED", "labs", "IT", "MEDIUM", { owner: "labs", delegate: "tech2", due: 6, blocked: "Firmware download needs an account that IT must create" }),
  T("Print and bind accreditation evidence files", "BLOCKED", "computing", "QA", "HIGH", { owner: "faculty", due: 4, blocked: "Print shop closed until Sunday" }),
  T("Order 20 replacement HDMI cables", "BLOCKED", "labs", "IT", "LOW", { owner: "labs", delegate: "tech", due: 7, blocked: "Supplier quotation not received" }),
  T("Confirm venue for the career fair", "BLOCKED", "admin", "EVT", "MEDIUM", { owner: "deputy", due: 9, blocked: "Waiting for confirmation from the main campus" }),
  T("Publish week 5 attendance report", "REVIEW", "computing", "AA", "MEDIUM", { owner: "faculty", due: 1 }),
  T("Complete inventory of laboratory equipment", "REVIEW", "labs", "LAB", "HIGH", { owner: "labs", delegate: "tech", due: 0 }),
  T("Draft revised student help desk procedure", "REVIEW", "computing", "STU", "MEDIUM", { owner: "faculty", due: 2 }),
  T("Set up user accounts for incoming staff", "REVIEW", "admin", "IT", "HIGH", { owner: "admin", due: 3 }),
  T("Prepare the Q3 progress report for the Dean", "REVIEW", "admin", "QA", "HIGH", { owner: "deputy", due: 1 }),
  T("Calibrate lab oscilloscopes", "REVIEW", "engineering", "LAB", "MEDIUM", { owner: "faculty2", due: 4 }),
  T("Review draft research ethics checklist", "REVIEW", "computing", "RES", "LOW", { owner: "faculty", due: 6 }),
  T("Set up the student project lab", "COMPLETED", "labs", "LAB", "HIGH", { owner: "labs", delegate: "tech", due: -3, age: 25 }),
  T("Update student help desk intake form", "COMPLETED", "admin", "STU", "LOW", { owner: "admin", due: -10, age: 30 }),
  T("Install antivirus on faculty laptops", "COMPLETED", "admin", "IT", "HIGH", { owner: "admin", due: -8, age: 28 }),
  T("Organise the staff welcome meeting", "COMPLETED", "admin", "EVT", "MEDIUM", { owner: "deputy", due: -12, age: 32 }),
  T("Renew the domain name for the CECIT site", "COMPLETED", "admin", "IT", "HIGH", { owner: "admin", due: -15, age: 35 }),
  T("Distribute course outlines to lecturers", "COMPLETED", "computing", "AA", "MEDIUM", { owner: "faculty", due: -9, age: 24 }),
  T("Replace faulty projector bulb in room B1", "COMPLETED", "computing", "IT", "LOW", { owner: "faculty", due: -6, age: 20 }),
  T("Complete fire safety training for lab staff", "COMPLETED", "labs", "ADM", "MEDIUM", { owner: "labs", delegate: "tech2", due: -5, age: 22 }),
  T("Order lab consumables for semester start", "COMPLETED", "labs", "FIN", "MEDIUM", { owner: "labs", due: -14, age: 38 }),
  T("Prepare exam timetable draft", "COMPLETED", "engineering", "AA", "HIGH", { owner: "faculty2", due: -4, age: 21 }),
  T("Publish accreditation visit agenda", "COMPLETED", "computing", "QA", "HIGH", { owner: "faculty", due: -7, age: 26 }),
  T("Back up the lab file server", "COMPLETED", "labs", "IT", "HIGH", { owner: "labs", delegate: "tech", due: -2, age: 18 }),
  T("Collect Year 3 internship placement forms", "COMPLETED", "engineering", "STU", "MEDIUM", { owner: "faculty2", due: -11, age: 29 }),
  T("Update the equipment loan register", "COMPLETED", "labs", "LAB", "LOW", { owner: "labs", delegate: "tech2", due: -13, age: 33 }),
];

const DEFAULT_AGE: Record<TaskStatus, number> = {
  UNASSIGNED: 3, ASSIGNED: 6, IN_PROGRESS: 10, BLOCKED: 12, REVIEW: 14, COMPLETED: 25,
};

// ---------- date helpers ----------
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const LOCAL_OFFSET_HOURS = 3;

function dueEndOfDay(offsetDays: number): Date {
  const local = new Date(Date.now() + LOCAL_OFFSET_HOURS * HOUR);
  const ms = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offsetDays, 23, 59, 59);
  return new Date(ms - LOCAL_OFFSET_HOURS * HOUR);
}
const daysAgo = (n: number): Date => new Date(Date.now() - n * DAY);

// ---------- main ----------
async function main(): Promise<void> {
  checkSafety();

  // Wipe old demo data so re-running gives a clean state.
  // task_events and audit_logs are append-only at the DB level, so we
  // temporarily disable their triggers for the truncate, then re-enable.
  await prisma.$executeRawUnsafe(`ALTER TABLE "task_events" DISABLE TRIGGER USER`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "task_events"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "task_events" ENABLE TRIGGER USER`);

  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.delegation.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.taskCodeSequence.deleteMany({});

  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" DISABLE TRIGGER USER`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "audit_logs"`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" ENABLE TRIGGER USER`);

  await prisma.session.deleteMany({});
  await prisma.invite.deleteMany({});
  await prisma.passwordReset.deleteMany({}); // ← FIX: blocks user.deleteMany
  await prisma.user.deleteMany({});

  const officeIds = {} as Record<OfficeKey, string>;
  for (const key of Object.keys(OFFICES) as OfficeKey[]) {
    const o = OFFICES[key];
    const row = await prisma.office.upsert({ where: { name: o.name }, update: { type: o.type }, create: o });
    officeIds[key] = row.id;
  }

  const catIds = {} as Record<CatKey, string>;
  for (const key of Object.keys(CATEGORIES) as CatKey[]) {
    const c = CATEGORIES[key];
    const row = await prisma.category.upsert({ where: { name: c.name }, update: { color: c.color }, create: c });
    catIds[key] = row.id;
  }

  const userIds = {} as Record<UserKey, string>;
  const userNames = {} as Record<UserKey, string>;
  for (const u of USERS) {
    const passwordHash = await hashPassword(PASSWORD);
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, fullName: u.fullName, role: u.role, officeId: officeIds[u.office], active: true },
      create: { email: u.email, fullName: u.fullName, role: u.role, officeId: officeIds[u.office], passwordHash, lastLoginAt: daysAgo(1) },
    });
    userIds[u.key] = row.id;
    userNames[u.key] = u.fullName;
  }

  if ((await prisma.task.count()) > 0) {
    console.warn("Tasks already exist: demo tasks skipped (use migrate reset on a LOCAL database for a clean start).");
  } else {
    const year = new Date().getFullYear();
    const prepared = TASKS.map((t, i) => ({ t, i, age: t.age ?? DEFAULT_AGE[t.status] + (i % 4) })).sort((a, b) => b.age - a.age);

    for (const { t, i, age } of prepared) {
      const ownerId = t.owner ? userIds[t.owner] : null;
      if (t.status !== "UNASSIGNED" && (!t.owner || t.due === undefined)) {
        throw new Error(`Bad seed task (needs owner and due date): ${t.title}`);
      }
      if (t.status === "BLOCKED" && !t.blocked) {
        throw new Error(`Bad seed task (needs reason): ${t.title}`);
      }

      const creator = userIds[t.priority === "URGENT" ? "dean" : "admin"];
      const assignerKey: UserKey = i % 3 === 0 ? "deputy" : "dean";
      const assigner = userIds[assignerKey];
      const delegateId = t.delegate ? userIds[t.delegate] : null;
      const executor = delegateId ?? ownerId ?? creator;

      const created = daysAgo(age);
      const step = (f: number): Date => new Date(created.getTime() + f * (Date.now() - created.getTime()));
      const doneAt = step(0.9);

      const seq = await prisma.taskCodeSequence.upsert({
        where: { year }, create: { year, lastSeq: 1 }, update: { lastSeq: { increment: 1 } },
      });

      const task = await prisma.task.create({
        data: {
          code: formatTaskCode(year, seq.lastSeq),
          title: t.title,
          description: "Demo task created by the seed script for demos and training.",
          status: t.status, priority: t.priority,
          officeId: officeIds[t.office], categoryId: catIds[t.cat],
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
          data: { taskId: task.id, delegateId, delegatedById: ownerId, status: "ACCEPTED", respondedAt: step(0.2), createdAt: step(0.15) },
        });
      }

      const ev: Prisma.TaskEventCreateManyInput[] = [
        { taskId: task.id, actorId: creator, type: "CREATED", toValue: "UNASSIGNED", createdAt: created },
      ];
      const comments: Prisma.CommentCreateManyInput[] = [];
      const started = ["IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED"].includes(t.status);

      if (t.status !== "UNASSIGNED" && t.owner) {
        ev.push({ taskId: task.id, actorId: assigner, type: "ASSIGNED", fromValue: "UNASSIGNED", toValue: "ASSIGNED", note: `Owner: ${userNames[t.owner]}`, createdAt: step(0.1) });
      }
      if (t.delegate && ownerId) {
        ev.push({ taskId: task.id, actorId: ownerId, type: "DELEGATED", note: `Delegated to ${userNames[t.delegate]}`, createdAt: step(0.15) });
      }
      if (started) {
        ev.push({ taskId: task.id, actorId: executor, type: "STATUS_CHANGED", fromValue: "ASSIGNED", toValue: "IN_PROGRESS", createdAt: step(0.25) });
      }
      if (t.status === "BLOCKED") {
        ev.push({ taskId: task.id, actorId: executor, type: "STATUS_CHANGED", fromValue: "IN_PROGRESS", toValue: "BLOCKED", note: t.blocked, createdAt: step(0.5) });
        comments.push({ taskId: task.id, authorId: executor, body: `Blocked: ${t.blocked ?? ""}`, createdAt: step(0.5) });
      }
      if (t.status === "REVIEW" || t.status === "COMPLETED") {
        ev.push({ taskId: task.id, actorId: ownerId ?? executor, type: "STATUS_CHANGED", fromValue: "IN_PROGRESS", toValue: "REVIEW", note: "Work completed; ready for review", createdAt: step(0.7) });
        comments.push({ taskId: task.id, authorId: ownerId ?? executor, body: "Work completed. Ready for review.", createdAt: step(0.7) });
      }
      if (t.status === "COMPLETED") {
        ev.push({ taskId: task.id, actorId: assigner, type: "STATUS_CHANGED", fromValue: "REVIEW", toValue: "COMPLETED", note: "Accepted", createdAt: doneAt });
        comments.push({ taskId: task.id, authorId: assigner, body: "Accepted. Thank you.", createdAt: doneAt });
      }
      await prisma.taskEvent.createMany({ data: ev });
      if (comments.length > 0) await prisma.comment.createMany({ data: comments });
    }
  }

  if ((await prisma.auditLog.count()) === 0) {
    const rows: Prisma.AuditLogCreateManyInput[] = [];
    for (const u of USERS) {
      rows.push({ actorId: userIds.admin, action: "user.create", entityType: "User", entityId: userIds[u.key], createdAt: daysAgo(30), meta: { seed: true } });
      rows.push({ actorId: userIds[u.key], action: "auth.login", ip: "127.0.0.1", userAgent: "seed", createdAt: daysAgo(1), meta: { seed: true } });
    }
    for (let n = 0; n < 3; n++) {
      rows.push({ actorId: null, action: "auth.login_failed", ip: "127.0.0.1", userAgent: "seed", createdAt: daysAgo(2), meta: { seed: true, email: "tech@mail.com" } });
    }
    await prisma.auditLog.createMany({ data: rows });
  }

  // Help Center
  console.log("🌱 Seeding Help Center...");
  await prisma.helpArticle.deleteMany();
  await prisma.helpCategory.deleteMany();

  const helpData = [
    {
      name: "Getting Started", slug: "getting-started", icon: "BookOpen", order: 1,
      articles: [
        { title: "Welcome to HAWL", content: "<p>HAWL is the official task management system for CECIT, University of Hargeisa. It replaces paper trails and WhatsApp messages with a secure, auditable Kanban workflow.</p><p>This platform is designed around <strong>accountability</strong> and <strong>transparency</strong>. Every action you take is logged in our immutable audit trail.</p>", order: 1 },
        { title: "Logging in for the first time", content: "<p>Your account is created by an Administrator. You will receive an invite link via email.</p><ol><li>Click the invite link.</li><li>Set your password (minimum 10 characters, 1 number, 1 uppercase).</li><li>You will be prompted to set up Two-Factor Authentication (2FA) if you are in a leadership role.</li></ol><p><strong>Passkeys:</strong> We highly recommend setting up a Passkey (FaceID/TouchID) in your Profile settings for faster, more secure logins.</p>", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", order: 2 },
        { title: "Understanding your Dashboard", content: "<p>Your dashboard is personalized based on your role. It shows:</p><ul><li><strong>Due This Week:</strong> Tasks that need attention soon.</li><li><strong>Overdue:</strong> Tasks that have passed their deadline.</li><li><strong>My Queue:</strong> Your personal to-do list, sorted by priority.</li><li><strong>Workload:</strong> A visual breakdown of the college's current task distribution.</li></ul>", order: 3 },
      ],
    },
    {
      name: "Tasks & Workflow", slug: "tasks-workflow", icon: "GitPullRequest", order: 2,
      articles: [
        { title: "The 6-Stage Workflow", content: "<p>Every task strictly follows these 6 stages. You cannot skip stages.</p><ol><li><strong>Unassigned:</strong> A task has been created but has no owner yet.</li><li><strong>Assigned:</strong> A coordinator or leader has assigned it to a technician.</li><li><strong>In Progress:</strong> The technician is actively working on it.</li><li><strong>Blocked:</strong> The technician cannot proceed and requires intervention.</li><li><strong>Review:</strong> The work is done, and it requires approval from the Dean or Deputy.</li><li><strong>Completed:</strong> The Dean/Deputy has approved the work.</li></ol>", order: 1 },
        { title: "Creating and Assigning a Task", content: "<p>Only Leadership and Coordinators can create tasks.</p><ol><li>Click the <strong>+ New Task</strong> button.</li><li>Fill in the Title, Category, Office, and Priority.</li><li>Set a Due Date.</li><li>Select an Owner (Technician).</li></ol><p>Once created, the assigned technician will receive an email notification instantly.</p>", order: 2 },
        { title: "How to submit for Review", content: "<p>When you finish a task, do not mark it as completed yourself.</p><p>Instead, drag it to the <strong>Review</strong> column. This alerts the Dean or Deputy that your work is ready for inspection. They will either <strong>Accept</strong> (moving it to Completed) or <strong>Return</strong> it (moving it back to In Progress with a comment).</p>", order: 3 },
      ],
    },
    {
      name: "Delegations", slug: "delegations", icon: "Users", order: 3,
      articles: [
        { title: "What is a Delegation?", content: "<p>If you are assigned a task but are unable to complete it (e.g., you are on leave), you can delegate it to another technician.</p><p>The task remains yours in the system, but the delegate gets temporary permission to update its status and add comments.</p>", order: 1 },
        { title: "Accepting or Declining a Delegation", content: "<p>If someone delegates a task to you, it will appear in your <strong>Delegations</strong> inbox.</p><ul><li>Click <strong>Accept</strong> to take responsibility for the task.</li><li>Click <strong>Decline</strong> to reject it (you must provide a reason).</li></ul><p>The person who delegated it will be notified of your response via email.</p>", order: 2 },
      ],
    },
    {
      name: "Security & 2FA", slug: "security", icon: "ShieldCheck", order: 4,
      articles: [
        { title: "Two-Factor Authentication (2FA)", content: "<p>Leadership roles (Dean, Deputy, Admin) are <strong>required</strong> to use 2FA.</p><ol><li>Go to your Profile > Security.</li><li>Click 'Enable 2FA'.</li><li>Scan the QR code with Google Authenticator or Authy.</li><li>Enter the 6-digit code to confirm.</li></ol><p><strong>Backup Codes:</strong> When you enable 2FA, you will be given 10 backup codes. <strong>Save these in a safe place.</strong> If you lose your phone, these codes are the only way to log in.</p>", order: 1 },
        { title: "What happens if I forget my password?", content: "<p>Click 'Forgot Password' on the login screen. You will receive an email with a secure, 1-hour link to reset it.</p><p>When you change your password, the system automatically revokes all active sessions on other devices. You will be logged out everywhere except the device you are currently using.</p>", order: 2 },
      ],
    },
    {
      name: "Troubleshooting & Common Issues", slug: "troubleshooting", icon: "LifeBuoy", order: 5,
      articles: [
        { title: "Why can't I move a task?", content: "<p>The system enforces strict role-based permissions. Common reasons a move is blocked:</p><ul><li><strong>You are not the owner:</strong> Only the assigned technician can move a task to 'In Progress'.</li><li><strong>You are not leadership:</strong> Only the Dean or Deputy can move a task from 'Review' to 'Completed'.</li><li><strong>Missing Information:</strong> If you are moving to 'Blocked', you must provide a reason.</li></ul>", order: 1 },
        { title: "My account is locked. What do I do?", content: "<p>After 5 failed login attempts, your account is locked for 15 minutes for security reasons.</p><p>Wait 15 minutes and try again. If you still cannot log in, click 'Forgot Password' or contact the system Administrator to unlock your account manually.</p>", order: 2 },
        { title: "File uploads are failing", content: "<p>Attachments must be under 10MB and must be a supported file type (PDF, PNG, JPG, DOCX, XLSX).</p><p>If the upload fails, check your internet connection and ensure the file is not corrupted. If the issue persists, contact IT support.</p>", order: 3 },
        { title: "Real-time notifications aren't working", content: "<p>HAWL uses Server-Sent Events (SSE) to push updates instantly.</p><p>If you aren't seeing the red notification bell update:</p><ul><li>Check your internet connection.</li><li>Refresh the page.</li><li>Ensure your corporate firewall isn't blocking 'text/event-stream' connections.</li></ul>", order: 4 },
      ],
    },
  ];

  for (const category of helpData) {
    await prisma.helpCategory.create({
      data: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        order: category.order,
        articles: { create: category.articles },
      },
    });
  }
  console.log("✅ Help Center seeded.");

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
