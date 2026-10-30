"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePreferences, type TranslationKey } from "@/lib/preferences";
import {
  BookOpen,
  GitPullRequest,
  Users,
  ShieldCheck,
  Search,
  LifeBuoy,
  ChevronDown,
  Mail,
  X,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type HelpSection = {
  id: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  titleKey: TranslationKey;
  itemKeys: TranslationKey[];
};

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    icon: BookOpen,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    titleKey: "help.section.gettingStarted.title",
    itemKeys: [
      "help.section.gettingStarted.item1",
      "help.section.gettingStarted.item2",
      "help.section.gettingStarted.item3",
      "help.section.gettingStarted.item4",
    ],
  },
  {
    id: "workflow",
    icon: GitPullRequest,
    color: "text-[#e8bc69]",
    bg: "bg-[#e8bc69]/10 border-[#e8bc69]/20",
    titleKey: "help.section.workflow.title",
    itemKeys: [
      "help.section.workflow.item1",
      "help.section.workflow.item2",
      "help.section.workflow.item3",
      "help.section.workflow.item4",
    ],
  },
  {
    id: "delegation",
    icon: Users,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    titleKey: "help.section.delegation.title",
    itemKeys: [
      "help.section.delegation.item1",
      "help.section.delegation.item2",
      "help.section.delegation.item3",
      "help.section.delegation.item4",
    ],
  },
  {
    id: "security",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    titleKey: "help.section.security.title",
    itemKeys: [
      "help.section.security.item1",
      "help.section.security.item2",
      "help.section.security.item3",
      "help.section.security.item4",
    ],
  },
  {
    id: "tips",
    icon: Lightbulb,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    titleKey: "help.section.tips.title",
    itemKeys: [
      "help.section.tips.item1",
      "help.section.tips.item2",
      "help.section.tips.item3",
      "help.section.tips.item4",
    ],
  },
];

const POPULAR_TOPICS: { labelKey: TranslationKey; sectionId: string }[] = [
  { labelKey: "help.popular.delegate", sectionId: "delegation" },
  { labelKey: "help.popular.blocked", sectionId: "workflow" },
  { labelKey: "help.popular.approve", sectionId: "workflow" },
  { labelKey: "help.popular.security", sectionId: "security" },
];

function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-[#e8bc69]/25 px-0.5 text-[#e8bc69]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function HelpPage() {
  const { t } = usePreferences();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["getting-started"]),
  );
  const [activeSection, setActiveSection] = useState<string>("getting-started");
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" to focus search, "Esc" to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !isInputTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return HELP_SECTIONS.map((s) => {
      const titleMatches = t(s.titleKey).toLowerCase().includes(q);
      const matchingItemKeys = q
        ? s.itemKeys.filter((k) => t(k).toLowerCase().includes(q))
        : s.itemKeys;
      const hasMatch = !q || titleMatches || matchingItemKeys.length > 0;
      return { section: s, titleMatches, matchingItemKeys, hasMatch };
    }).filter((r) => r.hasMatch);
  }, [searchQuery, t]);

  const isSearching = searchQuery.trim() !== "";

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    setExpandedSections((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const expandAll = () => setExpandedSections(new Set(HELP_SECTIONS.map((s) => s.id)));
  const collapseAll = () => setExpandedSections(new Set());
  const allExpanded = expandedSections.size === HELP_SECTIONS.length;

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 pb-12">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto pt-4 pb-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E293B] border border-[#334155] mb-6 shadow-xl shadow-black/20">
          <LifeBuoy className="h-8 w-8 text-[#e8bc69]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">{t("help.title")}</h1>
        <p className="text-[#94A3B8] text-base sm:text-lg mb-6">{t("help.subtitle")}</p>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder={t("help.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t("help.searchPlaceholder")}
            className="w-full rounded-2xl border border-[#334155] bg-[#1E293B] py-4 pl-12 pr-20 text-white placeholder-[#94A3B8] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69] shadow-lg"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchRef.current?.focus();
              }}
              aria-label={t("help.clearSearch")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#94A3B8] hover:bg-[#334155] hover:text-white transition"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 items-center rounded-md border border-[#334155] bg-[#0F172A] px-1.5 font-mono text-[10px] font-bold text-[#94A3B8]">
              /
            </kbd>
          )}
        </div>

        {!isSearching && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
              <Sparkles size={12} className="text-[#e8bc69]" />
              {t("help.popular.title")}
            </span>
            {POPULAR_TOPICS.map((topic) => (
              <button
                key={topic.labelKey}
                type="button"
                onClick={() => scrollToSection(topic.sectionId)}
                className="rounded-full border border-[#334155] bg-[#1E293B] px-3 py-1 text-xs font-bold text-[#A0ABC0] hover:border-[#e8bc69]/40 hover:text-[#e8bc69] transition"
              >
                {t(topic.labelKey)}
              </button>
            ))}
          </div>
        )}

        {isSearching && (
          <p className="mt-4 text-xs font-bold text-[#94A3B8]" role="status" aria-live="polite">
            {searchResults.length === 1
              ? t("help.searchSectionsOne", { count: searchResults.length })
              : t("help.searchSections", { count: searchResults.length })}
          </p>
        )}
      </section>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <nav
            aria-label={t("help.sidebar.title")}
            className="rounded-2xl border border-[#334155] bg-[#1E293B] p-2 overflow-x-auto lg:overflow-visible"
          >
            <p className="hidden lg:block px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              {t("help.sidebar.title")}
            </p>
            <div className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
              {HELP_SECTIONS.map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                      isActive
                        ? "bg-[#0F172A] text-white"
                        : "text-[#94A3B8] hover:bg-[#0F172A]/50 hover:text-white"
                    }`}
                  >
                    <Icon size={16} className={s.color} />
                    <span className="flex-1 truncate">{t(s.titleKey)}</span>
                    <span className="text-[10px] font-bold text-[#94A3B8]">
                      {s.itemKeys.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0 space-y-4">
          {!isSearching && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#94A3B8]">{t("help.sections.title")}</p>
              <button
                type="button"
                onClick={allExpanded ? collapseAll : expandAll}
                className="text-xs font-bold text-[#e8bc69] hover:underline"
              >
                {allExpanded ? t("help.collapseAll") : t("help.expandAll")}
              </button>
            </div>
          )}

          {searchResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
              <Search className="mx-auto h-12 w-12 text-[#475569] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">{t("help.noResults.title")}</h3>
              <p className="text-sm text-[#94A3B8] mb-4">
                {t("help.noResults.desc", { query: searchQuery })}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E293B] border border-[#334155] px-4 py-2 text-xs font-bold text-white hover:bg-[#334155] transition"
              >
                <X size={12} /> {t("help.clearSearch")}
              </button>
            </div>
          ) : (
            searchResults.map(({ section, titleMatches, matchingItemKeys }) => {
              const Icon = section.icon;
              const isExpanded = isSearching || expandedSections.has(section.id);
              const visibleItems =
                isSearching && !titleMatches ? matchingItemKeys : section.itemKeys;
              return (
                <div
                  key={section.id}
                  id={`help-${section.id}`}
                  className={`scroll-mt-4 rounded-2xl border bg-[#1E293B] overflow-hidden transition-all duration-300 ${
                    isExpanded
                      ? "border-[#e8bc69]/40 shadow-[0_4px_20px_-4px_rgba(232,188,105,0.1)]"
                      : "border-[#334155] hover:border-[#475569]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => !isSearching && toggleSection(section.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`help-panel-${section.id}`}
                    disabled={isSearching}
                    className="w-full flex items-center justify-between p-5 text-left disabled:cursor-default"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`shrink-0 p-2.5 rounded-xl border ${section.bg} ${section.color}`}
                      >
                        <Icon size={20} />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-white truncate">
                        <Highlight text={t(section.titleKey)} query={searchQuery} />
                      </h2>
                    </div>
                    {!isSearching && (
                      <ChevronDown
                        size={20}
                        className={`shrink-0 text-[#94A3B8] transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {isExpanded && (
                    <div id={`help-panel-${section.id}`} className="px-5 pb-5 pt-0">
                      <ul className="space-y-3 border-t border-[#334155] pt-4">
                        {visibleItems.map((itemKey) => (
                          <li
                            key={itemKey}
                            className="flex items-start gap-3 text-sm text-[#A0ABC0] leading-relaxed"
                          >
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${section.color}`}
                              aria-hidden
                            />
                            <span>
                              <Highlight text={t(itemKey)} query={searchQuery} />
                            </span>
                          </li>
                        ))}
                      </ul>

                      {!isSearching && (
                        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[#334155] bg-[#0F172A]/40 px-3 py-2">
                          {feedback[section.id] ? (
                            <p className="text-xs font-bold text-[#94A3B8]">
                              {feedback[section.id] === "yes"
                                ? t("help.feedback.thanksYes")
                                : t("help.feedback.thanksNo")}
                            </p>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-[#94A3B8]">
                                {t("help.feedback.title")}
                              </p>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedback((prev) => ({
                                      ...prev,
                                      [section.id]: "yes",
                                    }))
                                  }
                                  aria-label={t("help.feedback.yes")}
                                  title={t("help.feedback.yes")}
                                  className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-emerald-500/10 hover:text-emerald-400 transition"
                                >
                                  <ThumbsUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedback((prev) => ({
                                      ...prev,
                                      [section.id]: "no",
                                    }))
                                  }
                                  aria-label={t("help.feedback.no")}
                                  title={t("help.feedback.no")}
                                  className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400 transition"
                                >
                                  <ThumbsDown size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>
      </div>

      {/* Contact */}
      <div className="mt-8 rounded-2xl border border-[#334155] bg-[#0F172A] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-bold text-white mb-1">{t("help.contact.title")}</h3>
          <p className="text-sm text-[#94A3B8] max-w-md">{t("help.contact.desc")}</p>
        </div>
        <a
          href="mailto:support@cecit.edu.so"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1E293B] border border-[#334155] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#334155] hover:text-[#e8bc69] shrink-0"
        >
          <Mail size={16} /> {t("help.contact.email")}
        </a>
      </div>
    </div>
  );
}
