"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  X, ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  Compass, Eye, Search, SlidersHorizontal, PlusCircle, Kanban, ShieldCheck, Map, AlertTriangle,
  LayoutGrid, CheckSquare, Inbox, ClipboardCheck, Gauge, BarChart3, Users, Building2, Tag, ScrollText, HelpCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  padding?: number;
  noScroll?: boolean;
  optional?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="board-title"]',
    title: "Welcome to HAWL",
    description: "Your command center for CECIT. Let's take a quick tour — it takes 60 seconds.",
    icon: <Compass size={24} />,
    position: "bottom",
  },
  {
    target: '[data-tour="navbar"]',
    title: "Your Workspace",
    description: "This is your main navigation. We'll walk through every button in it, one by one, so you know exactly where everything lives.",
    icon: <Map size={24} />,
    position: "bottom",
  },

  {
    target: '[data-tour="nav-board"]',
    title: "Board",
    description: "The Kanban home. Every task is grouped by its current stage — from 'New' on the left to 'Completed' on the right. Drag cards to move them, or tap a card to open it.",
    icon: <LayoutGrid size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-my-tasks"]',
    title: "My Tasks",
    description: "Everything assigned to you, in one focused list. Filter by pending, in progress, or overdue so you always know what's next without hunting across the board.",
    icon: <CheckSquare size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-delegations"]',
    title: "Delegations",
    description: "Track what you've delegated and what's been delegated to you. See who owes what, follow up in a click, and close items out without leaving the page.",
    icon: <Inbox size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-review"]',
    title: "Review",
    description: "The approval queue. Tasks submitted for review land here. Approve, send back with notes, or reassign. Only leadership and coordinators see this button.",
    icon: <ClipboardCheck size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    description: "At-a-glance metrics for the whole department — task counts by status, overdue items, workload per person, and trends over time. Filter by office or category.",
    icon: <Gauge size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-reports"]',
    title: "Reports",
    description: "Generate and export reports. Filter by date range, category, owner, or status — then download as PDF or Excel for meetings, audits, and accountability.",
    icon: <BarChart3 size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-admin-users"]',
    title: "Users (Admin)",
    description: "Manage everyone in the system. Invite new staff, assign roles, reset passwords, impersonate users for support, and deactivate leavers. Admins only.",
    icon: <Users size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-admin-offices"]',
    title: "Offices (Admin)",
    description: "Set up departments, faculties, and offices. Each office has its own categories and coordinators, which drive task routing and reporting. Admins only.",
    icon: <Building2 size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-admin-categories"]',
    title: "Categories (Admin)",
    description: "Task categories like 'IT Support', 'Maintenance', 'Events'. Used to group tasks, drive filters, and power reports. Admins only.",
    icon: <Tag size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-admin-audit"]',
    title: "Audit Log (Admin)",
    description: "Full audit log. Every action — task created, edited, deleted, user role changed — is timestamped with who did it. For compliance and troubleshooting. Admins only.",
    icon: <ScrollText size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },
  {
    target: '[data-tour="nav-help"]',
    title: "Help",
    description: "Guides, FAQs, and contact info for the IT team. You can also re-run this onboarding tour from here anytime.",
    icon: <HelpCircle size={24} />,
    position: "bottom",
    noScroll: true,
    optional: true,
  },

  {
    target: '[data-tour="2fa-banner"]',
    title: "Security First",
    description: "If you see this banner, you must enable 2FA. It protects your account and the institution's data.",
    icon: <AlertTriangle size={24} />,
    position: "bottom",
    optional: true,
  },
  {
    target: '[data-tour="view-switcher"]',
    title: "Three views",
    description: "Board = Kanban. List = table. Calendar = by due date. Switch anytime.",
    icon: <Eye size={24} />,
    position: "bottom",
  },
  {
    target: '[data-tour="search"]',
    title: "Find anything",
    description: "Search any task by title, code, or description. Press / anywhere to jump here.",
    icon: <Search size={24} />,
    position: "bottom",
  },
  {
    target: '[data-tour="filters"]',
    title: "Filter the noise",
    description: "Narrow by date, only-your-tasks, or category. Combine any filters.",
    icon: <SlidersHorizontal size={24} />,
    position: "bottom",
  },
  {
    target: '[data-tour="new-task"]',
    title: "Create a Task",
    description: "Only leadership and coordinators can create tasks. Fill in title, category, priority, due date, and owner.",
    icon: <PlusCircle size={24} />,
    position: "bottom",
    optional: true,
  },
  {
    target: '[data-tour="columns"]',
    title: "The six stages",
    description: "Tasks flow left → right. Drag on desktop, use the 'Move to' dropdown on phones.",
    icon: <Kanban size={24} />,
    position: "bottom",
    padding: 6,
    noScroll: true,
  },
  {
    target: '[data-tour="profile-menu"]',
    title: "Stay secure & personalize",
    description: "Open your profile to enable 2FA, change your password, and switch between English, Arabic, and Somali or change the theme.",
    icon: <ShieldCheck size={24} />,
    position: "bottom",
  },
];

const TOOLTIP_WIDTH = 400;
const MOBILE_BREAKPOINT = 640;
const GAP = 20;
const MARGIN = 16;

type ArrowDir = "top" | "bottom" | "left" | "right";

export function SpotlightTour() {
  const [status, setStatus] = useState<"loading" | "needed" | "hidden">("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [completing, setCompleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ➕ ADDED: allow ?tour=1 to force-show the tour (dev/testing)
    if (new URLSearchParams(window.location.search).get("tour") === "1") {
      setStatus("needed");
      return;
    }
    let cancelled = false;
    api<{ data: { completed: boolean } }>("/auth/onboarding")
      .then((res) => { if (!cancelled) setStatus(res.data.completed ? "hidden" : "needed"); })
      .catch(() => { if (!cancelled) setStatus("hidden"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const step = TOUR_STEPS[stepIndex];

  const complete = useCallback(async () => {
    setCompleting(true);
    try { await api("/auth/onboarding/complete", { method: "POST" }); } catch { /* ignore errors */ }
    finally {
      setCompleting(false);
      setStatus("hidden");
      window.dispatchEvent(new CustomEvent("tour-confetti"));
    }
  }, []);

  const next = useCallback(() => {
    setStepIndex((prev) => {
      if (prev < TOUR_STEPS.length - 1) return prev + 1;
      void complete();
      return prev;
    });
  }, [complete]);

  const prev = useCallback(() => setStepIndex((p) => Math.max(0, p - 1)), []);

  useEffect(() => {
    if (status !== "needed" || !step) return;

    if (step.target === '[data-tour="profile-menu"]') {
      window.dispatchEvent(new Event("tour-open-profile"));
    } else {
      window.dispatchEvent(new Event("tour-close-profile"));
    }

    if (!step.target) { setTargetRect(null); return; }

    const el = document.querySelector(step.target);

    if (step.optional) {
      const isMissing = !el || el.getBoundingClientRect().height === 0;
      if (isMissing) {
        setTargetRect(null);
        const skipTimer = setTimeout(() => {
          if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(stepIndex + 1);
          } else {
            void complete();
          }
        }, 150);
        return () => clearTimeout(skipTimer);
      }
    }

    if (!el) { setTargetRect(null); return; }

    if (!step.noScroll) {
      const initialRect = el.getBoundingClientRect();
      if (initialRect.top < 100 || initialRect.bottom > window.innerHeight - 100) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    const measure = () => {
      const node = document.querySelector(step.target);
      if (!node) { setTargetRect(null); return; }
      setTargetRect(node.getBoundingClientRect());
    };
    measure();
    const timer = setTimeout(measure, 350);

    let rafId = 0;
    const onScrollOrResize = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(measure); };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize);
    };
  }, [step, status, stepIndex, complete]);

  useEffect(() => { if (status === "needed") cardRef.current?.focus(); }, [status, stepIndex]);

  useEffect(() => {
    if (status !== "needed") return;
    const handler = (e: KeyboardEvent) => {
      if (completing) return;
      if (e.key === "Escape") void complete();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status, next, prev, complete, completing]);

  if (status !== "needed" || !step) return null;

  const pad = step.padding ?? 10;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const tooltipStyle: React.CSSProperties = { position: "fixed", zIndex: 202 };
  let arrow: { dir: ArrowDir; offset: number } | null = null;

  if (isMobile) {
    tooltipStyle.left = 12; tooltipStyle.right = 12; tooltipStyle.bottom = 12;
    tooltipStyle.maxHeight = "55vh"; tooltipStyle.overflowY = "auto";
  } else if (!targetRect) {
    tooltipStyle.width = TOOLTIP_WIDTH; tooltipStyle.maxWidth = `calc(100vw - ${MARGIN * 2}px)`;
    tooltipStyle.left = "50%"; tooltipStyle.top = "50%"; tooltipStyle.transform = "translate(-50%, -50%)";
  } else {
    tooltipStyle.width = TOOLTIP_WIDTH;
    const pos = step.position ?? "bottom";
    const targetCenterX = targetRect.left + targetRect.width / 2;

    if (pos === "bottom") {
      const left = Math.max(MARGIN, Math.min(targetCenterX - TOOLTIP_WIDTH / 2, vw - TOOLTIP_WIDTH - MARGIN));
      tooltipStyle.left = left; tooltipStyle.top = targetRect.bottom + GAP;
      const offset = Math.max(16, Math.min(targetCenterX - left - 8, TOOLTIP_WIDTH - 24));
      arrow = { dir: "top", offset };
    } else if (pos === "top") {
      const left = Math.max(MARGIN, Math.min(targetCenterX - TOOLTIP_WIDTH / 2, vw - TOOLTIP_WIDTH - MARGIN));
      tooltipStyle.left = left; tooltipStyle.top = targetRect.top - GAP; tooltipStyle.transform = "translateY(-100%)";
      const offset = Math.max(16, Math.min(targetCenterX - left - 8, TOOLTIP_WIDTH - 24));
      arrow = { dir: "bottom", offset };
    } else if (pos === "right") {
      tooltipStyle.left = Math.min(targetRect.right + GAP, vw - TOOLTIP_WIDTH - MARGIN);
      tooltipStyle.top = targetRect.top + targetRect.height / 2; tooltipStyle.transform = "translateY(-50%)";
      arrow = { dir: "left", offset: 0 };
    } else if (pos === "left") {
      tooltipStyle.left = Math.max(targetRect.left - TOOLTIP_WIDTH - GAP, MARGIN);
      tooltipStyle.top = targetRect.top + targetRect.height / 2; tooltipStyle.transform = "translateY(-50%)";
      arrow = { dir: "right", offset: 0 };
    }

    if (typeof tooltipStyle.top === "number" && tooltipStyle.top + 320 > vh) {
      const left = tooltipStyle.left as number;
      tooltipStyle.top = targetRect.top - GAP; tooltipStyle.transform = "translateY(-100%)";
      const offset = Math.max(16, Math.min(targetCenterX - left - 8, TOOLTIP_WIDTH - 24));
      arrow = { dir: "bottom", offset };
    }
  }

  return (
    <>
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[200]" aria-hidden="true" style={{ width: vw, height: vh }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect x={targetRect.left - pad} y={targetRect.top - pad} width={targetRect.width + pad * 2} height={targetRect.height + pad * 2} rx={12} fill="black" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#spotlight-mask)" />
        {targetRect && (
          <rect x={targetRect.left - pad} y={targetRect.top - pad} width={targetRect.width + pad * 2} height={targetRect.height + pad * 2} rx={12} fill="none" stroke="#e8bc69" strokeOpacity={0.85} strokeWidth={2} />
        )}
      </svg>

      <div ref={cardRef} style={tooltipStyle} role="dialog" aria-modal="true" tabIndex={-1} className="rounded-3xl border border-[#334155] bg-[#1E293B] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] outline-none animate-in fade-in zoom-in-95 duration-200">
        {arrow && !isMobile && <TourArrow dir={arrow.dir} offset={arrow.offset} />}

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] border border-[#334155] text-[#e8bc69] shadow-inner">
                {step.icon}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{step.title}</h3>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#e8bc69] mt-1">Step {stepIndex + 1} of {TOUR_STEPS.length}</p>
              </div>
            </div>
            <button type="button" onClick={() => void complete()} disabled={completing} className="shrink-0 rounded-xl p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition disabled:opacity-50"><X size={20} /></button>
          </div>
          <p className="text-sm sm:text-base text-[#A0ABC0] leading-relaxed">{step.description}</p>
        </div>

        <div className="px-6 sm:px-8 pb-6 flex items-center justify-between gap-4 border-t border-[#334155] pt-5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TOUR_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? "w-6 bg-[#e8bc69]" : "w-1.5 bg-[#475569]"}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button type="button" onClick={prev} disabled={completing} className="flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#0F172A] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#334155] transition disabled:opacity-50">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <button type="button" onClick={next} disabled={completing} className="flex items-center gap-1.5 rounded-xl bg-[#e8bc69] px-5 py-2 text-xs sm:text-sm font-bold text-[#0F172A] hover:bg-[#f1cf8b] transition disabled:opacity-50 shadow-sm">
              {completing ? <Loader2 size={16} className="animate-spin" /> : isLast ? (<>Finish <CheckCircle2 size={16} /></>) : (<>Next <ChevronRight size={16} /></>)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TourArrow({ dir, offset }: { dir: ArrowDir; offset: number }) {
  const isTop = dir === "top", isBottom = dir === "bottom", isLeft = dir === "left", isRight = dir === "right";
  return (
    <div style={{
      position: "absolute", width: 0, height: 0,
      ...(isTop && { top: -8, left: offset, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid #334155" }),
      ...(isBottom && { bottom: -8, left: offset, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #334155" }),
      ...(isLeft && { left: -8, top: "50%", marginTop: -8, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "8px solid #334155" }),
      ...(isRight && { right: -8, top: "50%", marginTop: -8, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderLeft: "8px solid #334155" }),
    }} aria-hidden="true">
      <div style={{
        position: "absolute", width: 0, height: 0,
        ...(isTop && { top: 1, left: -7, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: "7px solid #1E293B" }),
        ...(isBottom && { bottom: 1, left: -7, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "7px solid #1E293B" }),
        ...(isLeft && { left: 1, top: -7, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderRight: "7px solid #1E293B" }),
        ...(isRight && { right: 1, top: -7, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "7px solid #1E293B" }),
      }} />
    </div>
  );
}
