// apps/web/lib/college-info.ts

export const COLLEGE = {
  name: "College of Engineering, Computing and Information Technology",
  short: "CECIT",
  university: "University of Hargeisa",
  tagline: "One College. Clear Responsibilities. Measurable Progress.",
  intro:
    "A centralized platform for coordinating academic and administrative activities, assigning responsibilities, monitoring deadlines, and strengthening accountability across the College.",
} as const;

/** Official statistics based on University of Hargeisa data */
export const COLLEGE_STATS: { label: string; value: string }[] = [
  { label: "Established", value: "1998" },
  { label: "Academic Departments", value: "3" },
  { label: "Laboratories & Facilities", value: "12+" },
  { label: "Active Students", value: "2,500+" },
];

export const DEPARTMENTS: { name: string; blurb: string }[] = [
  {
    name: "Computer Science & Information Technology",
    blurb: "Focuses on software engineering, networking, cybersecurity, and modern IT infrastructure.",
  },
  {
    name: "Engineering",
    blurb: "Covers civil, electrical, and mechanical engineering principles tailored for national infrastructure.",
  },
  {
    name: "Laboratories",
    blurb: "Practical learning environments equipped with modern hardware and industry-standard software.",
  },
];

export const ANNOUNCEMENTS: { date: string; title: string; body: string }[] = [
  {
    date: "Oct 24, 2026",
    title: "Final Year Project Defenses Scheduled",
    body: "All CECIT departments will begin final year project defenses starting November 15th. Students must submit their preliminary reports via the portal by November 1st.",
  },
  {
    date: "Oct 15, 2026",
    title: "New Lab Equipment Arrives",
    body: "The Computer Science department has received 50 new high-performance workstations for Lab B, significantly expanding our capacity for AI and Data Science coursework.",
  },
  {
    date: "Sep 01, 2026",
    title: "Fall Semester Begins",
    body: "Welcome to all new and returning students. Classes for the 2026-2027 academic year officially begin on September 5th. Please check the portal for your updated schedules.",
  },
];

export const GALLERY: { src: string; alt: string }[] = [
  { src: "/gallery/uoh-gate.jpg", alt: "University of Hargeisa main gate" },
  { src: "/gallery/computer-lab.jpg", alt: "CECIT Computer Lab" },
  { src: "/gallery/graduation.jpg", alt: "UoH Graduation Ceremony" },
];

export const CONTACT = {
  address: "Hargeisa, Somaliland",
  email: "cecit@uoh.edu.so",
  phone: "+252 63 400 0000",
};

export const FEATURES = [
  { title: "Task Management", description: "Create, assign, delegate and track tasks from one organised workspace." },
  { title: "Workflow & Approvals", description: "Move tasks through defined stages with controlled transitions." },
  { title: "Roles & Permissions", description: "Structure access around responsibilities, enforced by the backend." },
  { title: "Reports & Insights", description: "Bring task progress, overdue work and office activity into reporting." },
  { title: "Activity & Accountability", description: "Build a traceable history of every task update and decision." },
  { title: "Administrative Tools", description: "Organise offices, users and categories through a unified experience." },
] as const;

export const WORKFLOW = [
  { step: "01", label: "Unassigned", title: "Work is captured", description: "Tasks enter the system and wait for an owner." },
  { step: "02", label: "Assigned", title: "Ownership is clear", description: "Leadership or coordinators assign work to an officer in the reporting line." },
  { step: "03", label: "In Progress", title: "Progress gets updated", description: "The task owner starts work and updates its status." },
  { step: "04", label: "Blocked", title: "Blockers are surfaced", description: "A blocker includes a reason so the team knows where intervention is needed." },
  { step: "05", label: "Review", title: "Work is submitted", description: "Submitted work enters the review stage for leadership approval." },
  { step: "06", label: "Completed", title: "Accepted and closed", description: "The Dean or Deputy accepts the work and marks it complete." },
] as const;

export const FAQS = [
  { question: "Is HAWLHAYE mobile friendly?", answer: "Yes. HAWLHAYE is designed mobile-first and is installable as a Progressive Web App on supported iOS and Android devices." },
  { question: "How do I get an account?", answer: "Accounts are invite-only. Contact the CECIT Administrator to receive an invite link and set up your account." },
  { question: "Can I see tasks from other departments?", answer: "Access follows your reporting line. Leadership has broader oversight while coordinators and officers see tasks permitted for their role." },
  { question: "What happens when a task is blocked?", answer: "A blocked task should include a reason, helping coordinators and leadership understand what intervention may be needed." },
  { question: "Who can accept work in Review?", answer: "The Dean or Deputy Dean can accept or return work submitted for review." },
  { question: "Does the system send notifications?", answer: "HAWLHAYE supports real-time updates and email alerts for important task and security events." },
];

export const ROLES = [
  { name: "Deputy Dean", scope: "College-wide coordination" },
  { name: "Coordinator", scope: "Reporting-line oversight" },
  { name: "Faculty", scope: "Teaching & academic tasks" },
  { name: "Labs / Admin", scope: "Operations & support" },
] as const;

export const INTEGRATIONS = [
  { name: "Email alerts", detail: "Assignment, workflow and security updates" },
  { name: "Live updates", detail: "Server-sent events for fresh activity" },
  { name: "CSV / PDF reports", detail: "Export workload and activity reports" },
] as const;

export const TESTIMONIALS = [
  { quote: "The clear workflow and ownership make it easier to understand what is moving, what needs review, and where attention is required.", name: "College leadership", role: "Leadership perspective" },
  { quote: "A mobile-first workspace helps staff review tasks and keep up with updates without needing to be at a desk.", name: "Academic staff", role: "Everyday coordination" },
  { quote: "The activity history gives us a traceable view of task changes and decisions, helping accountability stay part of the process.", name: "Administrative team", role: "Operations perspective" },
] as const;

export const DAY_IN_LIFE = [
  { time: "08:00", title: "Check the board", description: "See priorities, assigned tasks, and anything overdue before the day starts." },
  { time: "10:30", title: "Move work forward", description: "Update progress, add context, and flag blockers with a reason." },
  { time: "13:00", title: "Submit for review", description: "Share completed work with the appropriate leadership for review." },
  { time: "16:00", title: "Close the loop", description: "Review updates, check next steps, and keep the task history complete." },
] as const;

export const REPORTS = [
  { title: "Task workload", description: "See workload by office, role, and status to help distribute work more clearly." },
  { title: "Deadline overview", description: "Surface due and overdue work so priorities are easier to manage." },
  { title: "Office activity", description: "Review activity and task movement across teams and reporting lines." },
] as const;

export const AUDIT_ITEMS = [
  { action: "Task assigned", detail: "Task owner and assignment updated", time: "Today · 09:42" },
  { action: "Status changed", detail: "Assigned → In Progress", time: "Today · 10:06" },
  { action: "Work submitted", detail: "Task moved to Review", time: "Today · 13:18" },
  { action: "Review decision recorded", detail: "Accepted by authorized leadership", time: "Today · 15:02" },
] as const;

export const SECURITY_ITEMS = [
  { title: "Role-based access", description: "Access is governed by server-side role and ownership checks, with deny-by-default principles." },
  { title: "Two-factor authentication", description: "TOTP-based 2FA and leadership enforcement add another layer to account security." },
  { title: "Passkeys & secure sessions", description: "Modern authentication options and protected session controls help secure sign-in." },
  { title: "Audit integrity", description: "Hash-chained audit logs support tamper detection and verification." },
] as const;

export const PLATFORM_METRICS = [
  "Six-stage task lifecycle",
  "Role-aware task visibility",
  "Leadership review workflow",
  "Live task notifications",
  "Installable mobile experience",
  "Exportable reports",
  "Security event auditability",
] as const;

/** University profile details cross-checked against the University of Hargeisa official background page. */
export const UNIVERSITY_PROFILE = {
  founded: "1998",
  operationsStarted: "2000",
  colleges: "7",
  faculties: "17",
  students: "6,500+",
  undergraduatePrograms: "34+",
  postgraduatePrograms: "20",
  alumni: "15,000+",
  campuses: "2",
  campusArea: "2.5 km²",
  motto: "Towards a better future",
  website: "https://uoh-edu.net/",
  background: "https://uoh-edu.net/about-background/",
} as const;
