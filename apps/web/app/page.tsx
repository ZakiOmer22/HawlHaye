import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

// ── Data ─────────────────────────────────────────────────────────
const stats = [
  { label: "Active Users", value: "150+" },
  { label: "Tasks Managed", value: "12K+" },
  { label: "Departments", value: "4" },
  { label: "Uptime", value: "99.9%" },
];

const features = [
  {
    icon: "↗",
    title: "Task Management",
    desc: "Create, assign, delegate and track tasks from one organised workspace.",
    tag: "Lifecycle",
  },
  {
    icon: "▤",
    title: "Workflow & Approvals",
    desc: "Move tasks through defined stages with controlled transitions.",
    tag: "6 Stages",
  },
  {
    icon: "⌘",
    title: "Roles & Permissions",
    desc: "Structure access around responsibilities, enforced by the backend.",
    tag: "RBAC",
  },
  {
    icon: "◷",
    title: "Reports & Insights",
    desc: "Bring task progress, overdue work and office activity into reporting.",
    tag: "Visibility",
  },
  {
    icon: "◎",
    title: "Activity & Accountability",
    desc: "Build a traceable history of every task update and decision.",
    tag: "Audit Trail",
  },
  {
    icon: "▦",
    title: "Administrative Tools",
    desc: "Organise offices, users and categories through a unified experience.",
    tag: "Management",
  },
];

const processSteps = [
  { step: "01", title: "Unassigned", desc: "Tasks enter the system and wait for an owner." },
  { step: "02", title: "Assigned", desc: "A coordinator assigns the task to a staff member." },
  { step: "03", title: "In Progress", desc: "The owner starts working and updates the status." },
  { step: "04", title: "Review", desc: "Work is submitted and waits for leadership approval." },
  { step: "05", title: "Completed", desc: "The Dean or Deputy accepts the work." },
];

const faqs = [
  {
    q: "Is HAWLHAYE mobile friendly?",
    a: "Yes. HAWLHAYE is built mobile-first. It acts as a Progressive Web App (PWA), meaning you can install it directly to your iOS or Android home screen.",
  },
  {
    q: "How do I get an account?",
    a: "Accounts are invite-only. Contact the CECIT Administrator to receive your invite link and set up your password.",
  },
  {
    q: "Can I see tasks from other departments?",
    a: "No. Role-Based Access Control (RBAC) is strictly enforced. You will only see tasks assigned to you, your office, or if you have leadership clearance.",
  },
  {
    q: "What happens when a task is blocked?",
    a: "If you are blocked, you must provide a reason. The task moves to the 'Blocked' column and notifies coordinators that intervention is needed.",
  },
];

// ── Page ─────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B132B] text-[#F8FAFC] selection:bg-[#e8bc69]/30 overflow-x-clip font-sans">
      <Navbar />

      {/* 1. Hero Section */}
      <section className="relative min-h-[95vh] flex items-center pt-24 bg-grid-dark">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(232,188,105,0.1)_0%,transparent_60%)] blur-2xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(28,37,65,0.8)_0%,transparent_70%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Hero Text */}
            <div>
              <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-[#e8bc69]/30 bg-[#e8bc69]/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#e8bc69] mb-8 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#e8bc69]" />
                Empowering World-Class Institutions
              </div>
              <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-8 text-white">
                Every Task.
                <br />
                Every Team.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e8bc69] to-[#f1cf8b]">
                  One Clear Direction.
                </span>
              </h1>
              <p className="animate-fade-up delay-200 text-lg sm:text-xl text-[#A0ABC0] max-w-xl leading-relaxed mb-10">
                HAWLHAYE brings institutional work into one organised, secure, and highly scalable
                workspace. Designed for the University of Hargeisa and built for the future of
                education.
              </p>
              <div className="animate-fade-up delay-300 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e8bc69] px-8 py-4 text-base font-bold text-[#0B132B] shadow-[0_0_30px_rgba(232,188,105,0.2)] transition hover:-translate-y-1 hover:bg-[#f1cf8b] hover:shadow-[0_0_40px_rgba(232,188,105,0.4)]"
                >
                  Access Workspace <span aria-hidden="true">→</span>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A3754] bg-[#1C2541]/50 backdrop-blur-md px-8 py-4 text-base font-bold text-white transition hover:border-[#e8bc69]/50 hover:text-[#e8bc69]"
                >
                  Explore Platform
                </a>
              </div>
            </div>

            {/* Hero Floating UI */}
            <div className="hidden lg:block relative animate-float">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#e8bc69]/20 to-transparent rounded-3xl blur-2xl transform rotate-3 scale-105" />
              <div className="relative rounded-2xl border border-[#2A3754] bg-[#1C2541]/80 p-4 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/40" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/40" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/40" />
                </div>
                <div className="rounded-xl bg-[#0B132B] p-6 border border-[#2A3754]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="text-xs text-[#A0ABC0] font-bold mb-1">Active Task</div>
                      <div className="text-lg text-white font-bold">Lab Setup - Block B</div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                      In Progress
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="h-2 w-full rounded-full bg-[#1C2541]">
                      <div className="h-full w-2/3 rounded-full bg-[#e8bc69]" />
                    </div>
                    <div className="flex justify-between text-xs text-[#A0ABC0]">
                      <span>Progress</span>
                      <span className="text-white font-bold">66%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trusted By Section */}
      <section className="border-y border-[#2A3754] bg-[#1C2541] py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="text-sm font-bold uppercase tracking-widest text-[#A0ABC0] shrink-0">
            Trusted By
          </p>
          <div className="flex flex-wrap justify-center md:justify-end gap-8 sm:gap-16 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition duration-500">
            <span className="text-xl font-black text-white">UNIVERSITY OF HARGEISA</span>
            <span className="text-xl font-black text-white">CECIT</span>
            <span className="text-xl font-black text-white">eALIF TEAM</span>
          </div>
        </div>
      </section>

      {/* 3. Stats Section */}
      <section className="bg-[#0B132B] py-20 border-b border-[#2A3754]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">{s.value}</p>
                <p className="text-sm font-bold uppercase tracking-widest text-[#e8bc69]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Bento Grid Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-6 lg:px-8 py-24">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e8bc69]">
            Enterprise Capabilities
          </p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl leading-tight">
            Everything you need. Nothing you don't.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Feature */}
          <div className="md:col-span-2 rounded-3xl border border-[#2A3754] bg-[#1C2541]/50 p-10 flex flex-col justify-between hover:border-[#e8bc69]/40 transition-colors group">
            <div>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B132B] border border-[#2A3754] text-2xl text-[#e8bc69] mb-8 transition group-hover:scale-110">
                ▤
              </span>
              <h3 className="text-3xl font-bold text-white mb-4">Advanced Workflow Engine</h3>
              <p className="text-lg text-[#A0ABC0] max-w-lg leading-relaxed">
                Define strict transitions, require approvals, and enforce accountability at every
                step. Our server-side state machine ensures no task bypasses the rules.
              </p>
            </div>
            <div className="mt-8 flex gap-3">
              <span className="rounded-lg bg-[#0B132B] px-4 py-2 text-sm font-bold text-white border border-[#2A3754]">
                Review Queue
              </span>
              <span className="rounded-lg bg-[#0B132B] px-4 py-2 text-sm font-bold text-white border border-[#2A3754]">
                Auto-Assign
              </span>
            </div>
          </div>

          {/* Smaller Features */}
          {features.slice(0, 4).map((f, i) => (
            <div
              key={i}
              className="rounded-3xl border border-[#2A3754] bg-[#1C2541]/50 p-8 hover:border-[#e8bc69]/40 transition-colors group"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B132B] border border-[#2A3754] text-xl text-[#e8bc69] mb-6 transition group-hover:scale-110">
                {f.icon}
              </span>
              <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
              <p className="text-sm text-[#A0ABC0] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Product Showcase Section */}
      <section
        id="showcase"
        className="border-y border-[#2A3754] bg-[#1C2541] py-24 overflow-hidden"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white sm:text-5xl">
              Built for absolute focus.
            </h2>
            <p className="mt-4 text-lg text-[#A0ABC0]">
              A clean, distraction-free interface that puts the work first.
            </p>
          </div>

          {/* Browser Mockup */}
          <div className="relative mx-auto max-w-5xl rounded-2xl border border-[#2A3754] bg-[#0B132B] p-2 shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A3754]">
              <div className="h-3 w-3 rounded-full bg-[#2A3754]" />
              <div className="h-3 w-3 rounded-full bg-[#2A3754]" />
              <div className="h-3 w-3 rounded-full bg-[#2A3754]" />
              <div className="ml-4 h-5 w-64 rounded-md bg-[#1C2541]" />
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="hidden md:block space-y-4">
                <div className="h-8 w-full rounded-lg bg-[#1C2541]" />
                <div className="h-8 w-3/4 rounded-lg bg-[#e8bc69]/20" />
                <div className="h-8 w-5/6 rounded-lg bg-[#1C2541]" />
                <div className="h-8 w-2/3 rounded-lg bg-[#1C2541]" />
              </div>
              {/* Board */}
              <div className="md:col-span-3 grid grid-cols-3 gap-4">
                {[1, 2, 3].map((col) => (
                  <div key={col} className="space-y-4">
                    <div className="h-6 w-24 rounded bg-[#1C2541]" />
                    {[1, 2].map((card) => (
                      <div
                        key={card}
                        className="rounded-xl border border-[#2A3754] bg-[#1C2541] p-4"
                      >
                        <div className="h-2 w-12 rounded bg-[#e8bc69]/40 mb-3" />
                        <div className="h-4 w-3/4 rounded bg-[#2A3754] mb-2" />
                        <div className="h-3 w-1/2 rounded bg-[#2A3754] mb-4" />
                        <div className="flex items-center justify-between">
                          <div className="h-6 w-6 rounded-full bg-[#0B132B]" />
                          <div className="h-2 w-12 rounded-full bg-[#2A3754]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Process / Timeline Section */}
      <section id="process" className="py-24 bg-[#0B132B]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white sm:text-5xl">The Six-Stage Workflow</h2>
            <p className="mt-4 text-lg text-[#A0ABC0]">
              Strict transitions ensure accountability at every step.
            </p>
          </div>

          <div className="relative border-l border-[#2A3754] ml-4 md:ml-0 md:border-l-0 md:flex md:justify-between md:border-t md:pt-10">
            {processSteps.map((step, i) => (
              <div key={i} className="mb-12 ml-8 md:ml-0 md:w-1/5 md:mb-0 relative">
                <span className="absolute -left-[41px] top-1 md:left-1/2 md:-top-[46px] md:-translate-x-1/2 flex h-4 w-4 rounded-full bg-[#e8bc69] ring-4 ring-[#0B132B]" />
                <div className="text-sm font-black text-[#e8bc69] mb-2">{step.step}</div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-[#A0ABC0] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Integrations / Ecosystem */}
      <section className="border-y border-[#2A3754] bg-[#1C2541] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl mb-6">Seamless Integrations</h2>
          <p className="text-lg text-[#A0ABC0] max-w-2xl mx-auto mb-16">
            Connect HAWLHAYE with the tools you already use. Built on a robust REST API.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["Microsoft 365", "Google Workspace", "Slack", "Zoom"].map((tool, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center p-8 rounded-2xl border border-[#2A3754] bg-[#0B132B] hover:border-[#e8bc69]/50 transition-colors group cursor-pointer"
              >
                <div className="h-12 w-12 rounded-xl bg-[#1C2541] mb-4 group-hover:scale-110 transition-transform flex items-center justify-center text-white font-black text-xl">
                  {tool.charAt(0)}
                </div>
                <span className="text-sm font-bold text-white">{tool}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Pricing / Plans (Enterprise SaaS Feel) */}
      <section id="pricing" className="py-24 bg-[#0B132B]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white sm:text-5xl">
              Simple, transparent plans.
            </h2>
            <p className="mt-4 text-lg text-[#A0ABC0]">
              Empower your entire institution with the right level of access.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plan 1 */}
            <div className="rounded-3xl border border-[#2A3754] bg-[#1C2541]/30 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">Department</h3>
              <p className="text-sm text-[#A0ABC0] mb-6">For individual faculties or labs.</p>
              <div className="text-4xl font-black text-white mb-8">Free</div>
              <ul className="space-y-4 mb-8 flex-1">
                {["Up to 20 users", "Basic Kanban board", "Standard reports", "Email support"].map(
                  (f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-[#A0ABC0]">
                      <span className="text-[#e8bc69]">✓</span> {f}
                    </li>
                  ),
                )}
              </ul>
              <button className="w-full py-3 rounded-xl border border-[#2A3754] text-white font-bold hover:bg-[#1C2541] transition">
                Get Started
              </button>
            </div>

            {/* Plan 2 (Highlighted) */}
            <div className="rounded-3xl border border-[#e8bc69] bg-[#1C2541] p-8 flex flex-col relative shadow-[0_0_40px_rgba(232,188,105,0.15)] transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#e8bc69] text-[#0B132B] px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Institution</h3>
              <p className="text-sm text-[#A0ABC0] mb-6">For the entire University of Hargeisa.</p>
              <div className="text-4xl font-black text-white mb-8">Custom</div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Unlimited users",
                  "Advanced workflow engine",
                  "Full audit trail",
                  "Priority 24/7 support",
                  "Dedicated success manager",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white">
                    <span className="text-[#e8bc69]">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-[#e8bc69] text-[#0B132B] font-bold hover:bg-[#f1cf8b] transition shadow-lg">
                Contact Sales
              </button>
            </div>

            {/* Plan 3 */}
            <div className="rounded-3xl border border-[#2A3754] bg-[#1C2541]/30 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-sm text-[#A0ABC0] mb-6">For multi-campus university networks.</p>
              <div className="text-4xl font-black text-white mb-8">Custom</div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Everything in Institution",
                  "SSO & SAML",
                  "Custom API limits",
                  "On-premise deployment",
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-[#A0ABC0]">
                    <span className="text-[#e8bc69]">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl border border-[#2A3754] text-white font-bold hover:bg-[#1C2541] transition">
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Testimonials */}
      <section id="testimonials" className="border-y border-[#2A3754] bg-[#1C2541] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white sm:text-4xl">Trusted by Leadership</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                q: "We finally have a clear picture of what every department is working on. The reporting is invaluable.",
                name: "Dean of CECIT",
                role: "Leadership",
              },
              {
                q: "Assigning tasks and tracking progress used to take hours. Now it takes seconds.",
                name: "Faculty Coordinator",
                role: "Computing",
              },
              {
                q: "The delegation feature means I can hand off lab setups to technicians and track them easily.",
                name: "Labs Coordinator",
                role: "Engineering",
              },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl border border-[#2A3754] bg-[#0B132B] p-8">
                <div className="flex gap-1 text-[#e8bc69] mb-4 text-xl">★★★★★</div>
                <p className="text-base leading-relaxed text-[#F8FAFC] italic mb-6">"{t.q}"</p>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-[#A0ABC0]">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FAQ Section */}
      <section id="faq" className="py-24 bg-[#0B132B]">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#2A3754] bg-[#1C2541]/50 p-6 transition hover:border-[#e8bc69]/30"
              >
                <h3 className="text-lg font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-[#A0ABC0] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Final CTA */}
      <section className="px-6 lg:px-8 py-24 relative overflow-hidden border-t border-[#2A3754] bg-[#1C2541]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(232,188,105,0.15),_transparent_60%)] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-black text-white sm:text-6xl mb-6 tracking-tight">
            Ready to bring clarity to your work?
          </h2>
          <p className="text-lg text-[#A0ABC0] mb-10 max-w-2xl mx-auto">
            Join the University of Hargeisa in managing tasks, reviewing work, and viewing reports
            all in one place.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#e8bc69] px-10 py-5 text-lg font-extrabold text-[#0B132B] shadow-[0_0_30px_rgba(232,188,105,0.3)] transition hover:-translate-y-1 hover:bg-[#f1cf8b] hover:shadow-[0_0_40px_rgba(232,188,105,0.5)]"
            >
              Enter Workspace <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
