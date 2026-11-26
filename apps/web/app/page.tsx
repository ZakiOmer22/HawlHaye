"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import {
  ArrowRight, ArrowUpRight, Activity, ShieldCheck, Users, Workflow, BarChart3,
  Clock3, CheckCircle2, Layers3, Bell, CalendarDays, ClipboardList, CircleDot,
  LockKeyhole, Smartphone, Laptop, Building2, Zap, Search, Sparkles,
  ChevronDown, ChevronRight, Play, GitBranch, Fingerprint, Database, Globe2,
  MessageSquare, Target, TrendingUp, Settings2, GraduationCap, BookOpen,
  Mail, MapPin, Phone, Star, Check, AlertCircle, Gauge, Shield,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ANNOUNCEMENTS, COLLEGE, COLLEGE_STATS, CONTACT, DEPARTMENTS, GALLERY,
  FEATURES, WORKFLOW, FAQS, ROLES, INTEGRATIONS, TESTIMONIALS, DAY_IN_LIFE,
  REPORTS, AUDIT_ITEMS, SECURITY_ITEMS, PLATFORM_METRICS,
} from "@/lib/college-info";

const fadeUp = {
  hidden: { opacity: 0, y: 34 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};
const shell = "mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-10";
const sectionPad = "py-20 sm:py-28";
const eyebrow = "mb-4 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent";
const heading = "text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl";
const subheading = "mt-5 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg";
const card = "rounded-3xl border border-border bg-panel/75 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl";

function SectionHeading({ kicker, title, description, centered = true }: { kicker: string; title: string; description?: string; centered?: boolean }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className={`${centered ? "mx-auto text-center" : ""} mb-12 max-w-3xl`}>
      <span className={eyebrow}><Sparkles className="h-3.5 w-3.5" />{kicker}</span>
      <h2 className={heading}>{title}</h2>
      {description && <p className={subheading}>{description}</p>}
    </motion.div>
  );
}

function GlowOrb({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`pointer-events-none absolute rounded-full blur-3xl ${className}`} />;
}

function TaskCard({ title, detail, status, progress, tone = "gold" }: { title: string; detail: string; status: string; progress: number; tone?: "gold" | "blue" | "green" }) {
  const bar = tone === "green" ? "bg-emerald-500" : tone === "blue" ? "bg-sky-500" : "bg-accent";
  const dot = tone === "green" ? "bg-emerald-500" : tone === "blue" ? "bg-sky-500" : "bg-accent";
  return (
    <div className="rounded-2xl border border-border bg-app/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-text-muted">{detail}</p></div>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[10px] font-bold"><i className={`h-1.5 w-1.5 rounded-full ${dot}`} />{status}</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-panel-hover"><motion.div initial={{ width: 0 }} whileInView={{ width: `${progress}%` }} viewport={{ once: true }} transition={{ duration: 1.1 }} className={`h-full rounded-full ${bar}`} /></div>
    </div>
  );
}

function CountStat({ value, label }: { value: string; label: string }) {
  return <motion.div variants={fadeUp} className="group rounded-2xl border border-border bg-panel p-6 text-center transition hover:-translate-y-1 hover:border-accent/40">
    <p className="text-3xl font-black tracking-tight sm:text-4xl">{value}<span className="text-accent">.</span></p>
    <p className="mt-2 text-xs font-bold uppercase tracking-widest text-text-muted">{label}</p>
  </motion.div>;
}

function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const x = useMotionValue(0); const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);
  return <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); x.set(e.clientX - r.left - r.width / 2); y.set(e.clientY - r.top - r.height / 2); }} onMouseLeave={() => { x.set(0); y.set(0); }} className={className}>{children}</motion.div>;
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLElement>(null);
  const workflowRef = useRef<HTMLElement>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [testimonial, setTestimonial] = useState(0);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroYRaw = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const heroY = useSpring(heroYRaw, { stiffness: 80, damping: 22, mass: 0.35 });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0.25]);
  const mediaScroll = useScroll({ target: mediaRef, offset: ["start end", "end start"] });
  const mediaY = useTransform(mediaScroll.scrollYProgress, [0, 1], [70, -70]);
  const smoothMediaY = useSpring(mediaY, { stiffness: 100, damping: 26 });
  const workflowScroll = useScroll({ target: workflowRef, offset: ["start end", "end start"] });
  const workflowProgressRaw = useTransform(workflowScroll.scrollYProgress, [0, 1], [0, 1]);
  const workflowProgress = useSpring(workflowProgressRaw, { stiffness: 90, damping: 24 });

  return (
    <main className="overflow-x-clip bg-app text-text-primary selection:bg-accent/25 selection:text-text-primary">
      <Navbar />
      {/* UNIVERSITY SPOTLIGHT · ADDED ABOVE THE ORIGINAL HAWLHAYE HERO */}
      <section className="relative isolate overflow-hidden border-b border-border bg-[#071321] text-white">
        <div className="absolute inset-0">
          <img src="gallery/uoh-gate.jpg" alt="University campus architecture" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06111f] via-[#071321]/85 to-[#071321]/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071321] via-transparent to-[#071321]/35" />
        </div>
        <div className={`${shell} relative z-10 py-20 sm:py-28`}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-5xl">
            <div className="mb-7 flex items-center gap-4">
              <img src="/uoh.png" alt="University of Hargeisa emblem" className="h-16 w-16 rounded-2xl border border-white/15 bg-white/10 p-2 object-contain" />
              <div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">The university behind the work</p><p className="mt-1 text-sm text-white/65">University of Hargeisa · Jaamacadda Hargeysa</p></div>
            </div>
            <h2 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">A place to learn.<br /><span className="text-amber-300">A future to build.</span></h2>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">Before HAWLHAYE brings work together, it belongs to a bigger story—an institution built around education, research, ambition, and service.</p>
            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[{ n: "1998", l: "Founded" }, { n: "2000", l: "Operations began" }, { n: "7", l: "Colleges" }, { n: "17", l: "Faculties" }].map((stat) => <div key={stat.l} className="rounded-2xl border border-white/15 bg-white/[.06] p-4 backdrop-blur-md"><p className="text-2xl font-black text-amber-300 sm:text-3xl">{stat.n}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/65 sm:text-xs">{stat.l}</p></div>)}
            </div>
          </motion.div>
        </div>
      </section>


      {/* UNIVERSITY STORY · IMAGE-LED EDITORIAL SECTION */}
      <section className="relative overflow-hidden bg-app py-20 sm:py-28">
        <div className={shell}>
          <div className="grid items-center gap-10 lg:grid-cols-[.95fr_1.05fr] lg:gap-16">
            <motion.div initial={{ opacity: 0, x: -28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
              <span className={eyebrow}><GraduationCap className="h-3.5 w-3.5" />A growing institution</span>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">From two faculties<br />to a wider horizon.</h2>
              <p className="mt-6 text-base leading-8 text-text-secondary">Founded in 1998 and beginning operations in 2000, the University of Hargeisa has grown into a multi-college institution serving students across undergraduate and postgraduate study.</p>
              <p className="mt-4 text-base leading-8 text-text-secondary">Its academic community brings together different disciplines, ambitions, and experiences—creating a campus where learning is connected to the needs of the wider society.</p>
              <div className="mt-8 flex flex-wrap gap-3"><a href="https://uoh-edu.net/about-background/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-accent/50 hover:text-accent">University story <ArrowUpRight className="h-4 w-4" /></a><a href="https://uoh-edu.net/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-text transition hover:-translate-y-0.5">Visit UoH <ArrowUpRight className="h-4 w-4" /></a></div>
            </motion.div>
            <motion.figure initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .8 }} className="group relative overflow-hidden rounded-[2rem] border border-border bg-panel shadow-2xl">
              <img src="https://www.kcl.ac.uk/newimages/nmpc/carousel-content-type/somaliland-maternity-sophie-french-hargeisa-780x450.xdd7b12bd.jpg?f=webp" alt="Students and staff gathered at the University of Hargeisa administration building" className="h-[360px] w-full object-cover transition duration-700 group-hover:scale-[1.03] sm:h-[480px]" loading="lazy" />
              <figcaption className="flex items-center justify-between gap-3 p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-accent">Campus community</p><p className="mt-1 font-bold">Learning is shaped by people, place, and purpose.</p></div><span className="rounded-full border border-border p-2 text-accent"><ArrowUpRight className="h-4 w-4" /></span></figcaption>
            </motion.figure>
          </div>
        </div>
      </section>


      {/* UNIVERSITY EXPERIENCE · DETAIL, NOT A PHOTO GALLERY */}
      <section className="overflow-hidden border-y border-border bg-panel/35 py-20 sm:py-28">
        <div className={shell}>
          <div className="mb-12 max-w-3xl"><span className={eyebrow}><BookOpen className="h-3.5 w-3.5" />The university experience</span><h2 className={heading}>More than a campus.<br /><span className="text-gradient-gold">A community in motion.</span></h2><p className={subheading}>Explore the university through the experiences that shape its identity—from classrooms and research to student milestones and community connections.</p></div>
          <div className="grid gap-5 lg:grid-cols-12">
            <motion.article initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${card} group overflow-hidden lg:col-span-7`}>
              <div className="relative h-64 overflow-hidden sm:h-[360px]"><img src="https://images.unsplash.com/photo-1523050854058-8df90110c9d1?auto=format&fit=crop&w=1400&q=85" alt="Graduates celebrating an academic milestone" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><div className="absolute bottom-5 left-5 right-5 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">01 · Achievement</p><h3 className="mt-2 text-2xl font-black sm:text-3xl">A milestone that opens new doors</h3></div></div>
              <div className="p-6"><p className="text-sm leading-7 text-text-secondary">Graduation marks the beginning of a new chapter. The university’s alumni carry their knowledge into public service, professional careers, business, and communities across the region.</p><a href="https://uoh-edu.net/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">Discover the university <ArrowUpRight className="h-4 w-4" /></a></div>
            </motion.article>
            <div className="grid gap-5 lg:col-span-5">
              <motion.article initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${card} group overflow-hidden`}>
                <div className="grid sm:grid-cols-[.9fr_1.1fr] sm:items-stretch"><div className="relative min-h-48 overflow-hidden"><img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=85" alt="Students collaborating in a learning space" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /></div><div className="p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">02 · Learning</p><h3 className="mt-2 text-xl font-extrabold">Knowledge built together</h3><p className="mt-3 text-sm leading-6 text-text-secondary">Classrooms and shared learning spaces encourage collaboration, curiosity, and practical problem solving.</p></div></div>
              </motion.article>
              <motion.article initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .1 }} className={`${card} group overflow-hidden`}>
                <div className="grid sm:grid-cols-[.9fr_1.1fr] sm:items-stretch"><div className="relative min-h-48 overflow-hidden"><img src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=85" alt="Research and technology workspace" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /></div><div className="p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">03 · Research</p><h3 className="mt-2 text-xl font-extrabold">Ideas that move beyond theory</h3><p className="mt-3 text-sm leading-6 text-text-secondary">Research, innovation, and community partnerships help connect academic knowledge to real-world challenges.</p></div></div>
              </motion.article>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 grid items-center gap-7 rounded-[2rem] border border-border bg-app p-6 sm:p-9 lg:grid-cols-[1fr_auto]">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">A university with reach</p><h3 className="mt-2 text-2xl font-black sm:text-3xl">34+ undergraduate programs · 20 postgraduate programs</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">The University’s official background describes a growing academic offering across seven colleges, serving more than 6,500 students and an alumni community of over 15,000.</p></div><a href="https://uoh-edu.net/about-background/" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-accent/50 hover:text-accent">Explore academics <ArrowUpRight className="h-4 w-4" /></a>
          </motion.div>
        </div>
      </section>


      {/* 01 · HERO */}
      <section ref={heroRef} className="relative isolate min-h-[92svh] overflow-hidden pt-28 sm:pt-32">
        <GlowOrb className="right-[-12rem] top-[-8rem] h-[34rem] w-[34rem] bg-accent/15" />
        <GlowOrb className="bottom-[-15rem] left-[-8rem] h-[30rem] w-[30rem] bg-sky-500/10" />
        <div className="absolute inset-0 -z-10 bg-grid-dark opacity-50" />
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className={`${shell} relative z-10 grid items-center gap-14 pb-24 lg:grid-cols-[1.05fr_.95fr]`}>
          <div>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mb-7 flex items-center gap-3">
              <img src="/uoh.png" alt="University of Hargeisa" className="h-12 w-12 object-contain" />
              <div className="text-xs font-bold leading-5"><span className="block text-accent">{COLLEGE.university}</span><span className="text-text-muted">{COLLEGE.name}</span></div>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={eyebrow}><Activity className="h-3.5 w-3.5" />Work. Organized. Moving forward.</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8 }} className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Every task has a place.<br /><span className="text-gradient-gold">Every effort moves us.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-7 max-w-xl text-lg leading-8 text-text-secondary sm:text-xl">{COLLEGE.intro}</motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-extrabold text-accent-text shadow-[0_0_36px_rgb(var(--color-accent)/.22)] transition hover:-translate-y-1 hover:shadow-[0_0_48px_rgb(var(--color-accent)/.32)]">Open Workspace <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
              <a href="#platform" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panel/60 px-6 py-3.5 font-bold transition hover:border-accent/40">Discover HAWLHAYE <ChevronRight className="h-4 w-4" /></a>
            </motion.div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-text-muted"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" />Built around accountability</span><span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-accent" />Mobile-first workspace</span></div>
          </div>
          <motion.div initial={{ opacity: 0, scale: .92, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: .9, delay: .35 }} className="relative mx-auto w-full max-w-xl">
            <GlowOrb className="inset-8 bg-accent/15" />
            <motion.div animate={{ y: [0, -9, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className={`${card} relative overflow-hidden p-3 sm:p-5`}>
              <div className="mb-4 flex items-center justify-between border-b border-border px-2 pb-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div><span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-extrabold text-accent">HAWL / BOARD</span></div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3"><div className="rounded-xl bg-app p-3"><p className="text-[10px] text-text-muted">Assigned to you</p><p className="mt-1 text-2xl font-black">08</p></div><div className="rounded-xl bg-app p-3"><p className="text-[10px] text-text-muted">In progress</p><p className="mt-1 text-2xl font-black text-sky-500">03</p></div><div className="rounded-xl bg-app p-3"><p className="text-[10px] text-text-muted">Completed</p><p className="mt-1 text-2xl font-black text-emerald-500">12</p></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-app p-3"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold">My tasks</p><span className="text-[10px] text-text-muted">This week</span></div><TaskCard title="Prepare lab inventory" detail="Laboratory · Due tomorrow" status="Progress" progress={62} tone="blue" /><div className="mt-2"><TaskCard title="Review project proposals" detail="Coordinator · Due Friday" status="Review" progress={85} tone="gold" /></div></div><div className="rounded-xl bg-app p-3"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold">Activity</p><span className="text-[10px] text-emerald-500">● Live</span></div><div className="space-y-3">{["Task assigned to Faculty", "Review request submitted", "Lab checklist completed"].map((t, i) => <div key={t} className="flex gap-2.5"><div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 1 ? "bg-sky-500" : "bg-accent"}`} /><div><p className="text-[11px] font-semibold">{t}</p><p className="text-[10px] text-text-muted">{["Just now", "12 min ago", "Yesterday"][i]}</p></div></div>)}</div></div></div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-app p-3 text-xs"><span className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-emerald-500" />Secure workspace</span><span className="text-text-muted">Access controlled</span></div>
            </motion.div>
          </motion.div>
        </motion.div>
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[10px] uppercase tracking-[.25em] text-text-muted sm:flex"><span className="h-8 w-px bg-gradient-to-b from-accent to-transparent" />Scroll to explore</div>
      </section>

      {/* 02 · STATS */}
      <section className={`${sectionPad} border-y border-border bg-panel/35`}>
        <div className={shell}><SectionHeading kicker="At a glance" title="A college in motion." description="A snapshot of the community and facilities behind CECIT." /><motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 gap-3 sm:grid-cols-4">{COLLEGE_STATS.map((s) => <CountStat key={s.label} value={s.value} label={s.label} />)}</motion.div></div>
      </section>

      {/* 03 · LIVE ACTIVITY TICKER */}
      <section className="overflow-hidden border-b border-border py-7">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-accent"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Campus activity stream</div>
        <div className="relative overflow-hidden"><motion.div className="flex w-max gap-4" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }}>{[...PLATFORM_METRICS, ...PLATFORM_METRICS].map((item, i) => <div key={`${item}-${i}`} className="flex items-center gap-3 rounded-full border border-border bg-panel px-5 py-3 text-sm font-semibold"><span className="text-accent">✦</span>{item}<span className="text-text-faint">/</span></div>)}</motion.div></div>
      </section>

      {/* 04 · FEATURE BENTO */}
      <section id="features" className={`${sectionPad} relative`}>
        <GlowOrb className="left-[-12rem] top-1/2 h-72 w-72 -translate-y-1/2 bg-sky-500/10" />
        <div className={shell}><SectionHeading kicker="Built for the real work" title="A toolkit, not another tab." description="A focused system for moving work through the college—with clarity at every step." /><div className="grid gap-4 md:grid-cols-6">
          <TiltCard className={`${card} relative overflow-hidden p-7 md:col-span-3 md:row-span-2`}><div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/20" /><div className="relative"><div className="mb-6 inline-flex rounded-2xl border border-accent/30 bg-accent/10 p-3 text-accent"><Workflow className="h-6 w-6" /></div><h3 className="text-2xl font-black">Workflow that stays accountable</h3><p className="mt-3 max-w-md text-sm leading-7 text-text-secondary">A structured six-stage task lifecycle keeps ownership, review, and completion easy to understand.</p><div className="mt-8 flex flex-wrap gap-2">{WORKFLOW.map((w) => <span key={w.label} className="rounded-full border border-border bg-app px-3 py-1.5 text-xs font-semibold">{w.label}</span>)}</div></div></TiltCard>
          {FEATURES.slice(0, 5).map((f, i) => <TiltCard key={f.title} className={`${card} p-6 transition hover:border-accent/35 md:col-span-3`}><div className="mb-4 inline-flex rounded-xl bg-accent/10 p-2.5 text-accent"><Layers3 className="h-5 w-5" /></div><h3 className="text-lg font-extrabold">{f.title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{f.description}</p></TiltCard>)}
        </div></div>
      </section>

      {/* 05 · WORKFLOW TIMELINE */}
      <section ref={workflowRef} id="workflow" className={`${sectionPad} border-y border-border bg-panel/35`}>
        <div className={shell}><SectionHeading kicker="The path of a task" title="Progress has a process." description="Six clear stages. No shortcuts through the approval path." /><div className="relative"><div className="absolute left-5 top-0 bottom-0 w-px bg-border sm:left-1/2" /><motion.div className="absolute left-5 top-0 w-px origin-top bg-accent sm:left-1/2" style={{ scaleY: workflowProgress }} />{WORKFLOW.map((w, i) => <motion.div key={w.label} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }} className={`relative mb-8 flex ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"} items-start gap-5 sm:gap-10`}><div className="relative z-10 mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-app text-xs font-black text-accent sm:absolute sm:left-1/2 sm:-translate-x-1/2">{w.step}</div><div className={`${card} w-full p-6 sm:w-[calc(50%-2.5rem)]`}><div className="flex items-center gap-2 text-xs font-bold text-accent"><span>{w.label}</span><span className="h-px w-8 bg-accent/40" /></div><h3 className="mt-2 text-xl font-black">{w.title}</h3><p className="mt-2 text-sm leading-7 text-text-secondary">{w.description}</p></div><div className="hidden sm:block sm:w-[calc(50%-2.5rem)]" /></motion.div>)}</div></div>
      </section>

      {/* 06 · DEPARTMENTS */}
      <section className={sectionPad} id="departments"><div className={shell}><SectionHeading kicker="Academic ecosystem" title="Different disciplines. One direction." description="A shared workspace supports the different teams and learning environments across CECIT." /><motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-4 md:grid-cols-3">{DEPARTMENTS.map((d, i) => <motion.article variants={fadeUp} key={d.name} className={`${card} group relative overflow-hidden p-7`}><div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-accent/5 blur-2xl transition group-hover:bg-accent/15" /><div className="relative"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-app text-accent">{i === 0 ? <Laptop /> : i === 1 ? <Building2 /> : <BookOpen />}</div><p className="text-xs font-bold tracking-widest text-accent">0{i + 1} / CECIT</p><h3 className="mt-3 text-xl font-extrabold">{d.name}</h3><p className="mt-3 text-sm leading-7 text-text-secondary">{d.blurb}</p><ArrowUpRight className="mt-6 h-5 w-5 text-text-muted transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent" /></div></motion.article>)}</motion.div></div></section>

      {/* 07 · ANNOUNCEMENTS */}
      <section className={`${sectionPad} bg-panel/35 border-y border-border`}><div className={shell}><SectionHeading kicker="What's happening" title="Updates, in the right place." description="Important information surfaced where teams can act on it." /><div className="mx-auto max-w-4xl space-y-4">{ANNOUNCEMENTS.map((a, i) => <motion.article key={a.title} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: .6, delay: i * .08 }} className={`${card} flex flex-col gap-4 p-6 sm:flex-row sm:items-start`}><div className="shrink-0 rounded-xl bg-accent/10 px-3 py-2 text-xs font-extrabold text-accent">{a.date}</div><div><h3 className="text-lg font-extrabold">{a.title}</h3><p className="mt-2 text-sm leading-7 text-text-secondary">{a.body}</p></div><ArrowUpRight className="ml-auto hidden h-5 w-5 shrink-0 text-text-muted sm:block" /></motion.article>)}</div></div></section>

      {/* 08 · SYSTEM SHOWCASE */}
      <section id="platform" className={`${sectionPad} relative overflow-hidden`}>
        <GlowOrb className="right-[-10rem] top-1/3 h-96 w-96 bg-accent/10" />
        <div className={shell}>
          <SectionHeading kicker="Inside the workspace" title="Designed for clarity. Engineered for momentum." description="A unified board keeps task ownership, status, and next steps visible without noise." />
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className={`${card} relative mx-auto max-w-6xl overflow-hidden p-3 sm:p-5`}>
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" /><i className="h-2.5 w-2.5 rounded-full bg-amber-400" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div>
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-app px-3 py-2 text-xs text-text-muted"><Search className="h-3.5 w-3.5" />Search tasks, people, and offices</div>
              <span className="hidden rounded-full bg-accent/10 px-3 py-2 text-xs font-bold text-accent sm:block">Workspace</span>
            </div>
            <div className="grid gap-3 p-2 sm:grid-cols-4 sm:p-4">
              <div className="hidden space-y-3 sm:block">
                <div className="mb-4 text-xs font-black text-accent">HAWLHAYE</div>
                {['Overview', 'My Tasks', 'Task Board', 'Reports', 'Activity', 'Settings'].map((name, i) => <div key={name} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${i === 2 ? 'bg-accent/10 text-accent font-bold' : 'text-text-muted'}`}><CircleDot className="h-3 w-3" />{name}</div>)}
              </div>
              <div className="sm:col-span-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black">Task Board</h3><p className="text-xs text-text-muted">Your team’s current workload</p></div><span className="rounded-lg border border-border px-2 py-1 text-xs">+ New task</span></div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {['Unassigned', 'Assigned', 'In Progress', 'Review'].map((column, i) => <div key={column} className="min-h-44 rounded-xl bg-app p-2">
                    <div className="mb-2 flex items-center justify-between text-[10px] font-bold">{column}<span className="rounded bg-panel px-1.5 py-0.5 text-text-muted">{i + 1}</span></div>
                    {[0, 1].slice(0, i === 0 ? 1 : 2).map((item) => <div key={item} className="mb-2 rounded-lg border border-border bg-panel p-2"><div className={`mb-2 h-1 w-9 rounded-full ${i === 2 ? 'bg-sky-500' : 'bg-accent'}`} /><div className="h-2 w-full rounded bg-panel-hover" /><div className="mt-1.5 h-2 w-3/4 rounded bg-panel-hover" /><div className="mt-3 flex items-center justify-between"><span className="h-4 w-4 rounded-full bg-accent/20" /><span className="text-[8px] text-text-muted">Due soon</span></div></div>)}
                  </div>)}
                </div>
              </div>
            </div>
          </motion.div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-text-muted"><span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Clear ownership</span><span className="flex items-center gap-1"><Clock3 className="h-4 w-4 text-accent" />Deadline awareness</span><span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-sky-500" />Permission-aware</span></div>
        </div>
      </section>


      {/* 09 · DAY IN THE LIFE */}
      <section className={`${sectionPad} border-y border-border bg-panel/35`}><div className={shell}><SectionHeading kicker="Day in the life" title="Start the day. Know the next move." description="A quick rhythm for busy college teams, from first check-in to final review." /><div className="grid gap-4 lg:grid-cols-4">{DAY_IN_LIFE.map((item, i) => <motion.div key={item.time} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className={`${card} p-6`}><div className="mb-5 flex items-center justify-between"><span className="text-xs font-black text-accent">{item.time}</span><span className="rounded-full bg-accent/10 p-2 text-accent">{i === 0 ? <CalendarDays /> : i === 1 ? <ClipboardList /> : i === 2 ? <CheckCircle2 /> : <MessageSquare />}</span></div><h3 className="text-lg font-extrabold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{item.description}</p></motion.div>)}</div></div></section>

      {/* 10 · ROLE HIERARCHY */}
      <section className={sectionPad}><div className={shell}><SectionHeading kicker="Role hierarchy" title="The right people. The right visibility." description="Access and oversight follow a structured reporting line, not an open directory." /><div className="mx-auto max-w-5xl"><div className="flex justify-center"><div className={`${card} flex max-w-xs items-center gap-4 border-accent/40 p-5`}><div className="rounded-xl bg-accent/15 p-3 text-accent"><GraduationCap /></div><div><p className="font-extrabold">Dean</p><p className="text-xs text-text-muted">College-wide oversight</p></div></div></div><div className="mx-auto h-8 w-px bg-accent/50" /><div className="mx-auto h-px w-2/3 bg-accent/50" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{ROLES.map((r, i) => <div key={r.name} className={`${card} relative p-4 text-center`}><div className="absolute -top-8 left-1/2 h-8 w-px bg-accent/50" /><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">{i === 0 ? <Users /> : i === 1 ? <Building2 /> : i === 2 ? <BookOpen /> : <Settings2 />}</div><p className="font-extrabold">{r.name}</p><p className="mt-1 text-xs text-text-muted">{r.scope}</p></div>)}</div><p className="mt-6 text-center text-xs text-text-muted">Visibility is enforced by server-side permissions and ownership rules.</p></div></div></section>

      {/* 11 · REPORTING */}
      <section className={`${sectionPad} border-y border-border bg-panel/35`}><div className={shell}><SectionHeading kicker="Reporting & insights" title="From workload to understanding." description="Reports turn activity into a practical view of workload, deadlines, and progress." /><div className="grid gap-4 md:grid-cols-3">{REPORTS.map((r, i) => <motion.div key={r.title} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className={`${card} p-6`}><div className="mb-5 flex items-center justify-between"><BarChart3 className="h-5 w-5 text-accent" /><span className="text-xs text-text-muted">REPORT 0{i + 1}</span></div><h3 className="text-lg font-extrabold">{r.title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{r.description}</p><div className="mt-6 flex h-12 items-end gap-1.5">{[30, 55, 42, 78, 60, 90, 70].map((v, k) => <motion.div key={k} initial={{ height: 0 }} whileInView={{ height: `${v}%` }} viewport={{ once: true }} transition={{ delay: k * .06 }} className="flex-1 rounded-t bg-accent/30" />)}</div></motion.div>)}</div><div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-text-muted"><span className="rounded-full border border-border px-3 py-1.5">CSV export</span><span className="rounded-full border border-border px-3 py-1.5">PDF export</span><span className="rounded-full border border-border px-3 py-1.5">Workload metrics</span></div></div></section>

      {/* 12 · AUDIT TRAIL */}
      <section className={sectionPad}><div className={shell}><SectionHeading kicker="Audit trail" title="Every action leaves a footprint." description="A traceable history makes decisions and task changes reviewable." /><div className={`${card} mx-auto max-w-4xl overflow-hidden`}><div className="flex items-center justify-between border-b border-border p-5"><div className="flex items-center gap-2 font-extrabold"><Fingerprint className="h-5 w-5 text-accent" />Audit history</div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">Integrity protected</span></div><div className="divide-y divide-border">{AUDIT_ITEMS.map((a, i) => <motion.div key={a.action} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * .08 }} className="grid grid-cols-[auto_1fr] gap-4 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><GitBranch className="h-4 w-4" /></div><div><p className="text-sm font-bold">{a.action}</p><p className="mt-1 text-xs text-text-muted">{a.detail}</p></div><span className="col-start-2 text-xs text-text-faint sm:col-start-auto">{a.time}</span></motion.div>)}</div></div></div></section>

      {/* 13 · SECURITY */}
      <section className={`${sectionPad} relative overflow-hidden border-y border-border bg-panel/35`}><GlowOrb className="left-[-12rem] top-1/2 h-80 w-80 -translate-y-1/2 bg-emerald-500/10" /><div className={shell}><SectionHeading kicker="Security & compliance" title="Security isn't a feature. It's a foundation." description="Layers of protection help safeguard accounts, data, and administrative workflows." /><div className="grid gap-4 md:grid-cols-2">{SECURITY_ITEMS.map((s, i) => <motion.div key={s.title} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className={`${card} flex items-start gap-4 p-6`}><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">{i === 0 ? <LockKeyhole /> : i === 1 ? <Shield /> : i === 2 ? <Fingerprint /> : <Database />}</div><div><h3 className="font-extrabold">{s.title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{s.description}</p></div></motion.div>)}</div></div></section>

      {/* 14 · INTEGRATIONS */}
      <section className={sectionPad}>
        <div className={shell}>
          <SectionHeading kicker="Connected ecosystem" title="Fits into your digital campus." description="Useful tools and services work alongside HAWL's task coordination experience." />
          <div className="relative mx-auto max-w-4xl py-8">
            <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-accent/25" />
            <div className="absolute left-1/2 top-1/2 h-[14rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-xl border border-border bg-panel p-3 text-accent"><Mail /></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-xl border border-border bg-panel p-3 text-accent"><Database /></div>
            </motion.div>
            <div className="relative mx-auto flex h-72 w-72 items-center justify-center rounded-full border border-accent/30 bg-accent/5 sm:h-80 sm:w-80">
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }} className="flex h-36 w-36 flex-col items-center justify-center rounded-3xl border border-accent/40 bg-panel shadow-[0_0_55px_rgb(var(--color-accent)/.12)]"><span className="text-3xl font-black text-accent">HAWL</span><span className="text-[10px] font-bold tracking-[.2em] text-text-muted">CORE</span></motion.div>
              <div className="absolute -left-1 top-8 rounded-xl border border-border bg-panel p-3 text-accent"><Globe2 /></div>
              <div className="absolute -right-1 top-8 rounded-xl border border-border bg-panel p-3 text-accent"><Bell /></div>
              <div className="absolute -left-1 bottom-8 rounded-xl border border-border bg-panel p-3 text-accent"><BarChart3 /></div>
              <div className="absolute -right-1 bottom-8 rounded-xl border border-border bg-panel p-3 text-accent"><Smartphone /></div>
            </div>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">{INTEGRATIONS.map((integration) => <div key={integration.name} className="rounded-2xl border border-border bg-panel p-4 text-center"><p className="font-extrabold">{integration.name}</p><p className="mt-1 text-xs text-text-muted">{integration.detail}</p></div>)}</div>
        </div>
      </section>


      {/* 15 · MOBILE PREVIEW */}
      <section className={`${sectionPad} border-y border-border bg-panel/35`}><div className={shell}><SectionHeading kicker="Mobile by design" title="Your workspace. Wherever the work happens." description="A responsive, installable experience keeps tasks within reach on phones and tablets." /><div className="grid items-center gap-12 lg:grid-cols-2"><div className="space-y-4">{["Installable PWA experience", "Tap-friendly task actions", "Offline awareness and status", "Review and follow up on the go"].map((t, i) => <motion.div key={t} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">{i + 1}</span><p className="font-bold">{t}</p><Check className="ml-auto h-4 w-4 text-emerald-500" /></motion.div>)}</div><motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="mx-auto w-64 rounded-[2.8rem] border-[7px] border-text-primary/80 bg-app p-3 shadow-2xl"><div className="mx-auto mb-4 h-5 w-24 rounded-full bg-text-primary/80" /><div className="rounded-3xl bg-panel p-4"><p className="text-xs font-bold text-accent">Good morning</p><p className="mt-1 text-xl font-black">Your day, in focus.</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-app p-3"><p className="text-[10px] text-text-muted">Active</p><p className="text-xl font-black">06</p></div><div className="rounded-xl bg-app p-3"><p className="text-[10px] text-text-muted">Due today</p><p className="text-xl font-black text-accent">02</p></div></div><div className="mt-4 space-y-2">{["Update lab inventory", "Prepare meeting notes", "Submit weekly report"].map((t, i) => <div key={t} className="rounded-xl border border-border bg-app p-3"><p className="text-xs font-bold">{t}</p><div className="mt-2 flex items-center justify-between text-[9px] text-text-muted"><span>{i === 0 ? "In progress" : "Assigned"}</span><span>Today</span></div></div>)}</div></div><div className="mx-auto mt-4 h-1 w-20 rounded-full bg-text-primary/70" /></motion.div></div></div></section>

      {/* 16 · STICKY MEDIA */}
      <section ref={mediaRef} className="relative min-h-[135vh] overflow-hidden border-y border-border"><div className="sticky top-0 flex min-h-[80vh] items-center overflow-hidden"><motion.div style={{ y: smoothMediaY }} className="absolute inset-0"><div className="absolute inset-0 bg-grid-dark opacity-40" /><GlowOrb className="left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 bg-accent/10" /></motion.div><div className={`${shell} relative z-10 grid items-center gap-10 py-24 lg:grid-cols-2`}><div><span className={eyebrow}><Play className="h-3.5 w-3.5" />Platform film</span><h2 className={heading}>Less friction.<br /><span className="text-gradient-gold">More forward motion.</span></h2><p className={subheading}>Imagine the entire college moving with shared context—assignments, updates, reviews, and decisions connected in one purposeful flow.</p><a href="#workflow" className="mt-8 inline-flex items-center gap-2 font-bold text-accent">See how it works <ArrowRight className="h-4 w-4" /></a></div><div className={`${card} relative overflow-hidden p-2`}><div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-panel-hover via-app to-panel"><motion.div animate={{ rotate: 360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }} className="absolute h-64 w-64 rounded-full border border-accent/20 border-t-accent/70" /><motion.div animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }} className="absolute h-44 w-44 rounded-full border border-sky-400/20 border-b-sky-400/70" /><div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-accent/40 bg-panel text-accent shadow-[0_0_40px_rgb(var(--color-accent)/.2)]"><Zap className="h-9 w-9" /></div><div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-border bg-app/80 p-3 backdrop-blur"><span className="text-xs font-bold">HAWLHAYE / SYSTEM</span><span className="flex items-center gap-1 text-xs text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span></div></div></div></div></div></section>

      {/* 17 · TESTIMONIALS */}
      <section className={sectionPad}><div className={shell}><SectionHeading kicker="People & progress" title="Built around the people doing the work." description="A platform should make coordination feel simpler, not heavier." /><div className={`${card} mx-auto max-w-4xl p-7 sm:p-12`}><div className="mb-8 flex gap-1 text-accent">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div><AnimatePresence mode="wait"><motion.div key={testimonial} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .3 }}><blockquote className="text-2xl font-bold leading-relaxed sm:text-3xl">“{TESTIMONIALS[testimonial].quote}”</blockquote><div className="mt-8"><p className="font-extrabold">{TESTIMONIALS[testimonial].name}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-accent">{TESTIMONIALS[testimonial].role}</p></div></motion.div></AnimatePresence><div className="mt-8 flex items-center justify-between"><div className="flex gap-2">{TESTIMONIALS.map((t, i) => <button key={t.name} aria-label={`Show testimonial ${i + 1}`} onClick={() => setTestimonial(i)} className={`h-2.5 rounded-full transition-all ${i === testimonial ? "w-8 bg-accent" : "w-2.5 bg-border"}`} />)}</div><div className="flex gap-2"><button onClick={() => setTestimonial((testimonial - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} aria-label="Previous quote" className="rounded-full border border-border p-3 hover:border-accent/50"><ChevronRight className="h-4 w-4 rotate-180" /></button><button onClick={() => setTestimonial((testimonial + 1) % TESTIMONIALS.length)} aria-label="Next quote" className="rounded-full border border-border p-3 hover:border-accent/50"><ChevronRight className="h-4 w-4" /></button></div></div></div></div></section>

      {/* 18 · COLLEGE GALLERY */}
      <section className={`${sectionPad} border-y border-border bg-panel/35`}><div className={shell}><SectionHeading kicker="Campus atmosphere" title="Where the ideas become real." description="Learning, collaboration, and hands-on work across the college." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{GALLERY.map((g, i) => <motion.figure key={g.src} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className={`${card} group overflow-hidden`}><div className="overflow-hidden"><img src={g.src} alt={g.alt} loading="lazy" className="h-64 w-full object-cover transition duration-700 group-hover:scale-105" /></div><figcaption className="flex items-center justify-between p-4 text-sm font-bold">{g.alt}<ArrowUpRight className="h-4 w-4 text-accent" /></figcaption></motion.figure>)}</div></div></section>

      {/* 19 · WORKLOAD & METRICS */}
      <section className={sectionPad}><div className={shell}><SectionHeading kicker="Workload balance" title="Make progress visible." description="A visual summary of work status helps teams identify what needs attention." /><div className={`${card} mx-auto max-w-4xl p-6 sm:p-9`}><div className="mb-8 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-text-muted">Workload overview</p><p className="text-xl font-black">Task distribution</p></div><span className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold">Illustrative preview</span></div><div className="space-y-5">{[{ name: "Completed", value: 72, color: "bg-emerald-500" }, { name: "In Progress", value: 58, color: "bg-sky-500" }, { name: "Review", value: 34, color: "bg-accent" }, { name: "Blocked", value: 12, color: "bg-rose-500" }].map((m) => <div key={m.name}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold">{m.name}</span><span className="text-text-muted">{m.value}%</span></div><div className="h-3 overflow-hidden rounded-full bg-app"><motion.div initial={{ width: 0 }} whileInView={{ width: `${m.value}%` }} viewport={{ once: true }} transition={{ duration: 1 }} className={`h-full rounded-full ${m.color}`} /></div></div>)}</div><p className="mt-6 text-xs text-text-muted">Illustrative data shown for visual demonstration only.</p></div></div></section>

      {/* 20 · PERFORMANCE */}
      <section className={`${sectionPad} border-y border-border bg-panel/35`}><div className={shell}><SectionHeading kicker="Operational performance" title="A healthier rhythm for teams." description="A simple operational dashboard provides a shared view of what is moving and what is waiting." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ icon: Gauge, label: "Task cycle", value: "Tracked", caption: "From assignment to completion" }, { icon: Clock3, label: "Deadline clarity", value: "Visible", caption: "Due dates and priorities" }, { icon: TrendingUp, label: "Workload trend", value: "Measured", caption: "Work distribution over time" }, { icon: Target, label: "Follow-through", value: "Reviewed", caption: "Work submitted and accepted" }].map((k) => <div key={k.label} className={`${card} p-6`}><k.icon className="h-5 w-5 text-accent" /><p className="mt-5 text-xs font-bold uppercase tracking-widest text-text-muted">{k.label}</p><p className="mt-2 text-2xl font-black">{k.value}</p><p className="mt-2 text-sm text-text-secondary">{k.caption}</p></div>)}</div></div></section>

      {/* 21 · INTEGRATION/COMMUNICATION */}
      <section className={sectionPad}><div className={shell}><SectionHeading kicker="Communication" title="The update reaches the people who need it." description="Notifications help teams stay aware of assignment changes, approvals, and key task events." /><div className="mx-auto max-w-3xl"><div className={`${card} overflow-hidden`}><div className="border-b border-border p-5"><p className="font-extrabold">Notification center</p><p className="mt-1 text-xs text-text-muted">Recent activity · preview</p></div>{["A task was assigned to your office", "Review requested for project plan", "Task status changed to Blocked", "Weekly report is ready"].map((n, i) => <div key={n} className="flex items-center gap-4 border-b border-border p-4 last:border-0"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${i === 2 ? "bg-rose-500/10 text-rose-500" : "bg-accent/10 text-accent"}`}>{i === 2 ? <AlertCircle /> : <Bell />}</span><div className="flex-1"><p className="text-sm font-bold">{n}</p><p className="mt-1 text-xs text-text-muted">{["Just now", "8 min ago", "35 min ago", "Today"][i]}</p></div><span className="h-2 w-2 rounded-full bg-sky-500" /></div>)}</div></div></div></section>

      {/* 22 · FAQ */}
      <section className={`${sectionPad} border-y border-border bg-panel/35`}><div className={shell}><SectionHeading kicker="Need to know" title="Questions, answered." description="A few helpful details before you enter the workspace." /><div className="mx-auto max-w-3xl space-y-3">{FAQS.map((f, i) => <div key={f.question} className={`${card} overflow-hidden`}><button className="flex w-full items-center justify-between gap-5 p-5 text-left sm:p-6" onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i}><span className="font-bold">{f.question}</span><motion.span animate={{ rotate: faqOpen === i ? 180 : 0 }} className="text-accent"><ChevronDown className="h-5 w-5" /></motion.span></button><AnimatePresence initial={false}>{faqOpen === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .28 }} className="overflow-hidden"><p className="px-5 pb-6 text-sm leading-7 text-text-secondary sm:px-6">{f.answer}</p></motion.div>}</AnimatePresence></div>)}</div></div></section>

      {/* 23 · CTA */}
      <section className="relative overflow-hidden py-24 sm:py-32"><GlowOrb className="left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 bg-accent/12" /><div className="absolute inset-0 bg-grid-dark opacity-35" /><motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`${shell} relative z-10 text-center`}><span className={eyebrow}><Zap className="h-3.5 w-3.5" />Make the next move</span><h2 className="mx-auto max-w-5xl text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl lg:text-8xl">Less chasing.<br /><span className="text-gradient-gold">More achieving.</span></h2><p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-text-secondary">Bring tasks, deadlines, decisions, and accountability into one clear workspace.</p><Link href="/login" className="group mt-9 inline-flex items-center gap-3 rounded-xl bg-accent px-7 py-4 font-extrabold text-accent-text shadow-[0_0_40px_rgb(var(--color-accent)/.25)] transition hover:-translate-y-1">Enter HAWLHAYE <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></Link><motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 1.8, repeat: Infinity }} className="mt-12 flex justify-center text-accent"><ArrowRight className="h-8 w-8 rotate-90" /></motion.div></motion.div></section>

      {/* 24 · FOOTER REVEAL */}
      <motion.section initial={{ y: 60, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8 }} className="border-t border-border bg-panel/45">
        <div className={`${shell} py-12 sm:py-16`}>
          <div className="grid gap-10 md:grid-cols-[1.2fr_.8fr] md:items-end">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-app p-6 sm:p-7">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <img src="/uoh.png" alt="University of Hargeisa emblem" className="h-20 w-20 shrink-0 rounded-2xl border border-border bg-panel p-3 object-contain" />
                <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-accent">Institutional home</p><h3 className="mt-2 text-xl font-black leading-tight sm:text-2xl">{COLLEGE.university}</h3><p className="mt-1 text-xs font-bold text-text-muted">{COLLEGE.name} · {COLLEGE.short}</p></div>
              </div>
              <p className="relative mt-5 max-w-xl text-sm leading-7 text-text-secondary">{COLLEGE.tagline}</p>
              <div className="relative mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-text-muted"><span className="rounded-full border border-border px-3 py-1.5">Founded 1998</span><span className="rounded-full border border-border px-3 py-1.5">Hargeisa, Somaliland</span><a href="https://uoh-edu.net/" target="_blank" rel="noreferrer" className="rounded-full border border-accent/35 px-3 py-1.5 text-accent hover:bg-accent/10">Official website ↗</a></div>
            </div>
            <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
              <a className="flex items-center gap-2 hover:text-accent" href={`mailto:${CONTACT.email}`}><Mail className="h-4 w-4 text-accent" />{CONTACT.email}</a>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{CONTACT.address}</span>
              <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" />{CONTACT.phone}</span>
              <Link href="/login" className="flex items-center gap-2 font-bold hover:text-accent"><LockKeyhole className="h-4 w-4 text-accent" />Workspace login</Link>
            </div>
          </div>
        </div>
        <Footer />
      </motion.section>
    </main>
  );
}
