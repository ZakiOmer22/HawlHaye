import Link from "next/link";

const features = [
  {
    number: "01",
    icon: "↗",
    title: "Task management",
    description:
      "Create, assign, delegate and track institutional tasks from one organised workspace.",
    tag: "Task lifecycle",
  },
  {
    number: "02",
    icon: "▤",
    title: "Workflow & approvals",
    description:
      "Move tasks through defined stages with controlled transitions and a clear review process.",
    tag: "Six workflow stages",
  },
  {
    number: "03",
    icon: "◷",
    title: "Reports & insights",
    description:
      "Bring task progress, overdue work and office activity into a clearer reporting experience.",
    tag: "Institutional visibility",
  },
  {
    number: "04",
    icon: "⌘",
    title: "Roles & permissions",
    description:
      "Structure access around responsibilities, with permissions enforced by the backend.",
    tag: "Role-based access",
  },
  {
    number: "05",
    icon: "◎",
    title: "Activity & accountability",
    description: "Build a traceable history of task updates, decisions, assignments and reviews.",
    tag: "Audit trail",
  },
  {
    number: "06",
    icon: "▦",
    title: "Administrative tools",
    description: "Organise offices, users and categories through a unified management experience.",
    tag: "Centralised management",
  },
];

const frontendFiles = [
  {
    path: "app/page.tsx",
    name: "Landing page",
    detail: "Public introduction to HAWLHAYE",
    status: "Current file",
  },
  {
    path: "app/layout.tsx",
    name: "Root layout",
    detail: "Global page structure, metadata and viewport",
    status: "Existing",
  },
  {
    path: "app/login/page.tsx",
    name: "Login screen",
    detail: "Authentication interface",
    status: "Scaffold",
  },
  {
    path: "app/(app)/layout.tsx",
    name: "Application shell",
    detail: "Navigation and authenticated page layout",
    status: "Planned",
  },
  {
    path: "app/(app)/board/page.tsx",
    name: "Task board",
    detail: "Six workflow columns and task organisation",
    status: "Existing",
  },
  {
    path: "app/(app)/my-tasks/page.tsx",
    name: "My tasks",
    detail: "Tasks relevant to the current user",
    status: "Planned",
  },
  {
    path: "app/(app)/review/page.tsx",
    name: "Review queue",
    detail: "Tasks awaiting review and decisions",
    status: "Planned",
  },
  {
    path: "app/(app)/tasks/[code]/page.tsx",
    name: "Task details",
    detail: "Task history, comments and status actions",
    status: "Planned",
  },
  {
    path: "app/(app)/dashboard/page.tsx",
    name: "Dashboard",
    detail: "Progress summaries and operational indicators",
    status: "Planned",
  },
  {
    path: "app/(app)/reports/data/page.tsx",
    name: "Data reports",
    detail: "Institutional reports, filters and exports",
    status: "Planned",
  },
  {
    path: "app/(app)/reports/system/page.tsx",
    name: "System reports",
    detail: "System reporting and audit information",
    status: "Planned",
  },
  {
    path: "app/(app)/admin/users/page.tsx",
    name: "User administration",
    detail: "Users, roles and invitations",
    status: "Planned",
  },
  {
    path: "app/(app)/admin/offices/page.tsx",
    name: "Office administration",
    detail: "Institutional office management",
    status: "Planned",
  },
  {
    path: "app/(app)/help/page.tsx",
    name: "Help & guidance",
    detail: "Quick-start instructions and frequently asked questions",
    status: "Planned",
  },
  {
    path: "components/ui/",
    name: "Shared UI components",
    detail: "Reusable buttons, chips, modals and tables",
    status: "Folder to create",
  },
  {
    path: "components/layout/",
    name: "Layout components",
    detail: "Navigation, bottom bar and page headers",
    status: "Folder to create",
  },
  {
    path: "components/board/",
    name: "Board components",
    detail: "Task cards, columns and drag-and-drop",
    status: "Folder to create",
  },
  {
    path: "components/tasks/",
    name: "Task components",
    detail: "Task forms, details, comments and history",
    status: "Folder to create",
  },
  {
    path: "components/reports/",
    name: "Reporting components",
    detail: "Charts, filters and export controls",
    status: "Folder to create",
  },
  {
    path: "components/admin/",
    name: "Administration components",
    detail: "User lists and invitation forms",
    status: "Folder to create",
  },
  {
    path: "lib/api.ts",
    name: "API client",
    detail: "Shared helper for communicating with the backend",
    status: "Existing",
  },
  {
    path: "public/",
    name: "Static assets",
    detail: "Application icons, manifest and images",
    status: "Existing",
  },
  {
    path: "app/globals.css",
    name: "Global styles",
    detail: "Tailwind directives and application-wide styles",
    status: "Existing",
  },
];

const architecture = [
  {
    name: "Web application",
    path: "apps/web/",
    detail: "Next.js · React · Tailwind CSS",
  },
  {
    name: "Shared package",
    path: "packages/shared/",
    detail: "Roles · statuses · workflow · schemas",
  },
  {
    name: "Backend API",
    path: "apps/api/",
    detail: "Express · TypeScript · API routes",
  },
  {
    name: "Database",
    path: "apps/api/prisma/",
    detail: "Prisma schema and database migrations",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-[#15243b]">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#142b4a] text-xl font-black text-[#e8bc69] shadow-lg shadow-slate-900/10">
              H
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-[0.16em] text-[#142b4a]">HAWLHAYE</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Work. Organised.
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a className="transition hover:text-[#b78637]" href="#about">
              About
            </a>
            <a className="transition hover:text-[#b78637]" href="#features">
              Features
            </a>
            <a className="transition hover:text-[#b78637]" href="#workflow">
              Workflow
            </a>
            <a className="transition hover:text-[#b78637]" href="#getting-started">
              Getting started
            </a>
            <a className="transition hover:text-[#b78637]" href="#add-pages">
              Add pages
            </a>
            <a className="transition hover:text-[#b78637]" href="#expectations">
              What to expect
            </a>
            <a className="transition hover:text-[#b78637]" href="#frontend">
              Frontend files
            </a>
          </nav>

          <Link
            href="/board"
            className="rounded-xl bg-[#142b4a] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#203e63] sm:px-5"
          >
            Open workspace <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(224,183,105,0.18),_transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.03fr_0.97fr] lg:py-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dfbd7b]/60 bg-[#fffaf0] px-3.5 py-2 text-xs font-bold text-[#8c672b]">
              <span className="h-2 w-2 rounded-full bg-[#c99a4b]" />
              CECIT · Institutional workflow platform
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-[1.1] tracking-tight text-[#142b4a] sm:text-6xl lg:text-[68px]">
              Every task.
              <br />
              Every team.
              <br />
              <span className="text-[#bd9147]">One clear direction.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              HAWLHAYE brings institutional work into one organised workspace. Assign
              responsibilities, follow progress, manage approvals and build a clearer picture of the
              work that matters.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/board"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#142b4a] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-[#142b4a]/15 transition hover:-translate-y-0.5 hover:bg-[#203e63]"
              >
                Explore the workspace
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-[#142b4a] transition hover:border-[#bd9147]"
              >
                Discover the project
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="text-[#bd9147]">✓</span> Structured workflows
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#bd9147]">✓</span> Role-based access
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#bd9147]">✓</span> Centralised reporting
              </span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-[#d8e2ee]/50 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-[#142b4a]/10">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-sm font-extrabold text-[#142b4a]">Workspace overview</p>
                  <p className="mt-1 text-xs text-slate-500">HAWLHAYE · Task management</p>
                </div>
                <span className="rounded-lg bg-[#fff7e8] px-3 py-1.5 text-xs font-bold text-[#a1742c]">
                  Preview
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-5">
                {[
                  { label: "Unassigned", count: "08", color: "#d8e4f2" },
                  { label: "In progress", count: "14", color: "#e8d7a8" },
                  { label: "In review", count: "05", color: "#d7e8dc" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4"
                  >
                    <div
                      className="mb-4 h-1.5 w-8 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="text-2xl font-black text-[#142b4a]">{item.count}</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-500 sm:text-xs">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#142b4a]">Workflow snapshot</p>
                  <span className="text-xs text-slate-400">Illustrative data</span>
                </div>
              </div>

              <div className="space-y-3 px-5 pb-6">
                {[
                  {
                    code: "CECIT-2026-001",
                    title: "Prepare departmental work plan",
                    person: "Office coordination",
                    status: "In progress",
                    tone: "bg-blue-50 text-blue-700",
                    width: "70%",
                  },
                  {
                    code: "CECIT-2026-002",
                    title: "Review submitted documentation",
                    person: "Academic administration",
                    status: "In review",
                    tone: "bg-amber-50 text-amber-800",
                    width: "85%",
                  },
                  {
                    code: "CECIT-2026-003",
                    title: "Complete operational checklist",
                    person: "Assigned staff",
                    status: "Completed",
                    tone: "bg-emerald-50 text-emerald-700",
                    width: "100%",
                  },
                ].map((task) => (
                  <div
                    key={task.code}
                    className="rounded-2xl border border-slate-100 p-4 transition hover:border-[#d8c08f]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-wide text-slate-400">
                          {task.code}
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#142b4a]">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{task.person}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${task.tone}`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#bd9147]"
                        style={{ width: task.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-[#142b4a] px-5 py-4 text-xs text-white">
                <span className="font-semibold">One workspace. Clear ownership.</span>
                <span className="font-bold text-[#e8bc69]">HAWLHAYE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project introduction */}
      <section id="about" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78637]">
              About the project
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#142b4a] sm:text-4xl">
              Work management built around accountability.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-slate-600">
            <p>
              HAWLHAYE is designed to help teams organise institutional tasks, coordinate
              responsibilities and follow work from assignment through review and completion.
            </p>
            <p>
              Its architecture separates the web interface, backend API, shared workflow rules and
              database. This creates a foundation for consistent permissions, controlled task
              transitions and maintainable development.
            </p>
            <div className="rounded-2xl border border-[#ead9b4] bg-[#fffaf0] p-5">
              <p className="font-bold text-[#142b4a]">The project objective</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Make institutional work easier to assign, follow, review, report and improve—with
                clear responsibilities at every stage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78637]">
            What the platform covers
          </p>
          <h2 className="mt-4 text-3xl font-black text-[#142b4a] sm:text-4xl">
            Everything connected to the work.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            A modular experience designed around tasks, people, approvals, operational visibility
            and administration.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#d8bd83] hover:shadow-xl hover:shadow-slate-900/5"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#142b4a] text-2xl text-[#e8bc69] transition group-hover:bg-[#203e63]">
                  {feature.icon}
                </span>
                <span className="text-sm font-bold text-slate-300">{feature.number}</span>
              </div>
              <h3 className="mt-6 text-lg font-extrabold text-[#142b4a]">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-[#a77a32]">{feature.tag}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="bg-[#142b4a] text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
              The workflow
            </p>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              From an open task to a clear outcome.
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              The application board is built from six shared workflow statuses. This overview
              illustrates the stages; actual transitions are governed by the application's workflow
              rules and permissions.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["01", "Unassigned", "Ready for ownership"],
              ["02", "Assigned", "Responsibility established"],
              ["03", "In progress", "Work underway"],
              ["04", "In review", "Submitted for review"],
              ["05", "Completed", "Work finished"],
              ["06", "Blocked", "Needs intervention"],
            ].map(([number, title, detail]) => (
              <div
                key={number}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition hover:border-[#e8bc69]/60 hover:bg-white/[0.08]"
              >
                <p className="text-sm font-black text-[#e8bc69]">{number}</p>
                <h3 className="mt-6 font-extrabold">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-300">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-white/[0.06] p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold">A consistent set of workflow rules</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Shared definitions live in packages/shared, rather than being duplicated across the
                frontend and API.
              </p>
            </div>
            <Link
              href="/board"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#e8bc69] px-5 py-3 text-sm font-extrabold text-[#142b4a] transition hover:bg-[#f1cf8b]"
            >
              View task board <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78637]">
              Under the hood
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#142b4a] sm:text-4xl">
              A modular foundation.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              HAWLHAYE separates interface, business logic and persistence into dedicated packages,
              making it easier for the team to develop and maintain each part.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {architecture.map((item, index) => (
              <div
                key={item.path}
                className="flex gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-[#d8bd83]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f0e6] font-black text-[#a77a32]">
                  0{index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#142b4a]">{item.name}</h3>
                  <code className="mt-1 block break-all text-xs text-[#a77a32]">{item.path}</code>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-[#f8fafc] p-5">
            <p className="text-sm font-bold text-[#142b4a]">Request lifecycle</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
              {[
                "Browser UI",
                "API client",
                "Express API",
                "Shared rules",
                "Prisma / PostgreSQL",
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
                    {item}
                  </span>
                  {index < 4 && (
                    <span className="text-[#bd9147]" aria-hidden="true">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Installation and getting started guide - added without removing existing sections */}
      <section id="getting-started" className="border-y border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78637]">
              Beginner's guide
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#142b4a] sm:text-4xl">
              Install HAWLHAYE and get started.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Follow these steps to prepare your computer, start the frontend, and open the project
              in your browser.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f0e6] font-black text-[#a77a32]">
                  01
                </span>
                <h3 className="text-lg font-extrabold text-[#142b4a]">Install the tools</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Install Node.js (LTS) and Visual Studio Code. Download or clone the HAWLHAYE
                repository, then open the repository's root folder in VS Code.
              </p>
              <a
                href="https://nodejs.org/"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex font-bold text-[#a77a32] hover:text-[#142b4a]"
              >
                Get Node.js{" "}
                <span aria-hidden="true" className="ml-2">
                  →
                </span>
              </a>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f0e6] font-black text-[#a77a32]">
                  02
                </span>
                <h3 className="text-lg font-extrabold text-[#142b4a]">Install dependencies</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Open the terminal in VS Code at the repository root (the folder containing the main
                package.json), then run:
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#142b4a] p-4 text-sm text-emerald-200">
                <code>npm ci</code>
              </pre>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f0e6] font-black text-[#a77a32]">
                  03
                </span>
                <h3 className="text-lg font-extrabold text-[#142b4a]">Start the frontend</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                From the same repository root, start the Next.js web application:
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#142b4a] p-4 text-sm text-emerald-200">
                <code>npm run dev:web</code>
              </pre>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Then open{" "}
                <code className="rounded bg-slate-100 px-1.5 py-1 text-[#142b4a]">
                  http://localhost:3000
                </code>{" "}
                in your browser.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f0e6] font-black text-[#a77a32]">
                  04
                </span>
                <h3 className="text-lg font-extrabold text-[#142b4a]">Check that it is running</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Keep the terminal open while developing. Next.js normally refreshes the page after
                you save changes. Press Ctrl+C in the terminal to stop the development server.
              </p>
            </article>
          </div>

          <div className="mt-6 rounded-2xl border border-[#ead9b4] bg-[#fffaf0] p-6">
            <h3 className="font-extrabold text-[#142b4a]">If installation does not work</h3>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              <li>
                • Check Node.js and npm with <code>node -v</code> and <code>npm -v</code>.
              </li>
              <li>• Make sure you are running commands from the repository root.</li>
              <li>
                • If the dev command is not recognised, check the scripts in the root package.json.
              </li>
              <li>
                • If port 3000 is already in use, use the alternative local address printed in the
                terminal.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Simple page creation guide - added without removing existing sections */}
      <section id="add-pages" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78637]">
              Build step by step
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#142b4a] sm:text-4xl">
              Add a page in a few simple steps.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              HAWLHAYE uses the Next.js App Router. A folder containing a page.tsx file creates a
              route. For example, a help page can live inside the existing application route group.
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-extrabold text-[#142b4a]">Step 1 — Create the file</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                In VS Code, create this folder and file under apps/web:
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#142b4a] p-5 text-sm leading-7 text-emerald-200">
                <code>{`app/
  (app)/
    help/
      page.tsx`}</code>
              </pre>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The (app) folder is a route group, so it does not appear in the URL. This page's
                route is <code>/help</code>.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-extrabold text-[#142b4a]">Step 2 — Add a simple page</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Put this starter component inside the new page.tsx file:
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#142b4a] p-5 text-sm leading-7 text-slate-100">
                <code>{`export default function HelpPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">
        HAWLHAYE Help Center
      </h1>
      <p className="mt-4 text-slate-300">
        Guidance for tasks, reviews, and reports.
      </p>
    </main>
  );
}`}</code>
              </pre>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#f8fafc] p-6">
            <h3 className="font-extrabold text-[#142b4a]">Step 3 — Open and test it</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Save the file and visit <code>http://localhost:3000/help</code>. If the page is inside{" "}
              <code>app/(app)/</code>, check the existing application layout, authentication rules,
              and navigation menu. A new page creates the screen and URL; it does not automatically
              connect the screen to the API or database.
            </p>
          </div>
        </div>
      </section>

      {/* Project expectations - added without removing existing sections */}
      <section id="expectations" className="border-y border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78637]">
              Before you begin
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#142b4a] sm:text-4xl">
              What to expect as you build.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              The website interface, API, shared rules, and database are separate parts of the
              project. A visible page does not necessarily mean every feature behind it is complete.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-extrabold text-[#142b4a]">Frontend pages</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Pages and components define what users see. Some routes may still be starter screens
                or planned files, so check the file status guide below before assuming a screen is
                complete.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-extrabold text-[#142b4a]">API and database</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Saving tasks, signing in, enforcing permissions, and producing live reports require
                working backend endpoints and database configuration. Installing frontend packages
                does not set these up automatically.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-extrabold text-[#142b4a]">Build and test gradually</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Add one page or feature at a time. Test the route, check the browser and terminal
                for errors, and verify API and database behavior before relying on the feature.
              </p>
            </article>
          </div>

          <div className="mt-6 rounded-2xl border border-[#ead9b4] bg-[#fffaf0] p-6">
            <p className="font-extrabold text-[#142b4a]">A useful rule</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Keep existing code and styling when adding a feature. Reuse shared components where
              possible, keep workflow rules in the shared package when appropriate, and enforce
              important permissions on the backend rather than relying only on hiding frontend
              buttons.
            </p>
          </div>
        </div>
      </section>

      {/* Frontend file guide */}
      <section id="frontend" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b78637]">
              Developer guide
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#142b4a] sm:text-4xl">
              Know where every frontend file belongs.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              A practical map of the web application: pages, reusable components, API helpers and
              static assets.
            </p>
          </div>

          <Link
            href="/board"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#142b4a] transition hover:border-[#bd9147] lg:self-auto"
          >
            Open application <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-[#f8fafc] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="font-extrabold text-[#142b4a]">Frontend file reference</p>
              <p className="mt-1 text-xs text-slate-500">Root: apps/web/</p>
            </div>
            <span className="w-fit rounded-lg bg-[#142b4a] px-3 py-2 text-xs font-bold text-white">
              Next.js App Router
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {frontendFiles.map((file) => (
              <div
                key={file.path}
                className="grid gap-2 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-6"
              >
                <div className="min-w-0">
                  <code className="break-all text-xs font-bold text-[#a77a32] sm:text-sm">
                    {file.path}
                  </code>
                  <p className="mt-1 text-sm font-extrabold text-[#142b4a]">{file.name}</p>
                </div>
                <p className="text-sm leading-6 text-slate-500">{file.detail}</p>
                <span
                  className={`w-fit rounded-md px-2.5 py-1 text-[10px] font-bold ${
                    file.status === "Existing" || file.status === "Current file"
                      ? "bg-emerald-50 text-emerald-700"
                      : file.status === "Scaffold"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {file.status}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-[#f8fafc] px-5 py-4 text-xs leading-6 text-slate-500 sm:px-6">
            File statuses reflect the supplied project guide. Planned entries and folders to create
            are part of the target structure and should not be interpreted as already implemented
            files.
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-5 pb-20 sm:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#142b4a] px-6 py-12 sm:px-12 sm:py-16">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-16 h-64 w-64 rounded-full border border-[#e8bc69]/20" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e8bc69]">
                Get started
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
                Bring clarity to the work that matters.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-slate-300">
                Explore the HAWLHAYE workspace and its task-management interface.
              </p>
            </div>

            <Link
              href="/board"
              className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-[#e8bc69] px-6 py-4 text-sm font-extrabold text-[#142b4a] transition hover:-translate-y-0.5 hover:bg-[#f1cf8b]"
            >
              Enter HAWLHAYE <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-extrabold tracking-[0.14em] text-[#142b4a]">HAWLHAYE</p>
            <p className="mt-1 text-xs text-slate-500">
              An institutional task and workflow management project.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-500">
            <a href="#about" className="hover:text-[#a77a32]">
              About
            </a>
            <a href="#features" className="hover:text-[#a77a32]">
              Features
            </a>
            <a href="#frontend" className="hover:text-[#a77a32]">
              Developer guide
            </a>
            <Link href="/board" className="hover:text-[#a77a32]">
              Workspace
            </Link>
          </div>
          <p className="text-xs text-slate-400">© 2026 HAWLHAYE · CECIT</p>
        </div>
      </footer>
    </main>
  );
}
