"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  BookOpen,
  Search,
  LifeBuoy,
  ChevronDown,
  Mail,
  X,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Loader2,
  ArrowRight,
} from "lucide-react";
import * as LucideIcons from "lucide-react";

type HelpArticle = {
  id: string;
  title: string;
  content: string;
  videoUrl?: string | null;
  fileUrl?: string | null;
};

type HelpCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  articles: HelpArticle[];
};

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

function DynamicIcon({
  name,
  size = 20,
  className = "",
}: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  if (!name) return <BookOpen size={size} className={className} />;
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[name];
  if (!IconComponent) return <BookOpen size={size} className={className} />;
  return <IconComponent size={size} className={className} />;
}

export default function HelpPage() {
  const [categories, setCategories] = useState<HelpCategory[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>("");
  const [feedback, setFeedback] = useState<Record<string, "yes" | "no">>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ data: HelpCategory[] }>("/help")
      .then((res) => {
        setCategories(res.data);
        if (res.data.length > 0) {
          setExpandedSections(new Set([res.data[0].slug]));
          setActiveSection(res.data[0].slug);
        }
      })
      .catch((err) => {
        console.error("Failed to load help center", err);
        setCategories([]);
      });
  }, []);

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

  useEffect(() => {
    if (!categories) return;
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const cat = categories.find((c) => c.slug === hash);
      if (cat) {
        setActiveSection(cat.slug);
        setExpandedSections((prev) => new Set(prev).add(cat.slug));
        setTimeout(() => {
          document
            .getElementById(`help-${cat.slug}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [categories]);

  const searchResults = useMemo(() => {
    if (!categories) return [];
    const q = searchQuery.trim().toLowerCase();
    return categories
      .map((cat) => {
        const titleMatches = cat.name.toLowerCase().includes(q);
        const matchingArticles = q
          ? cat.articles.filter(
            (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
          )
          : cat.articles;
        const hasMatch = !q || titleMatches || matchingArticles.length > 0;
        return { category: cat, titleMatches, matchingArticles, hasMatch };
      })
      .filter((r) => r.hasMatch);
  }, [searchQuery, categories]);

  const isSearching = searchQuery.trim() !== "";

  const toggleSection = useCallback((slug: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const scrollToSection = useCallback((slug: string) => {
    setActiveSection(slug);
    setExpandedSections((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${slug}`);
    }
    document.getElementById(`help-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const expandAll = () => categories && setExpandedSections(new Set(categories.map((c) => c.slug)));
  const collapseAll = () => setExpandedSections(new Set());
  const allExpanded = categories ? expandedSections.size === categories.length : false;

  if (!categories) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8bc69]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-5 pb-[calc(4rem+env(safe-area-inset-bottom))] [-webkit-tap-highlight-color:transparent]">
      {/* ────────────────────── Hero ────────────────────── */}
      <section className="text-center max-w-3xl mx-auto pt-2 pb-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E293B] border border-[#334155] mb-4 shadow-lg shadow-black/20">
          <LifeBuoy className="h-7 w-7 text-[#e8bc69]" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
          How can we help you?
        </h1>
        <p className="text-[#94A3B8] text-sm sm:text-base mb-5 px-2">
          Search for guides, watch training videos, and learn how to use HAWL.
        </p>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search help articles"
            className="w-full rounded-2xl border border-[#334155] bg-[#1E293B] py-3.5 pl-12 pr-12 text-base text-white placeholder-[#94A3B8] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69] shadow-lg"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-lg text-[#94A3B8] hover:bg-[#334155] hover:text-white active:bg-[#334155] active:text-white transition"
            >
              <X size={18} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 items-center rounded-md border border-[#334155] bg-[#0F172A] px-1.5 font-mono text-[10px] font-bold text-[#94A3B8]">
              /
            </kbd>
          )}
        </div>
      </section>

      {/* ────────────────────── Layout ────────────────────── */}
      <div className="grid lg:grid-cols-[260px_1fr] gap-5 sm:gap-6">

        {/* Mobile Horizontal Tabs */}
        <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto relative">
          {/* Fade effect to show scrollability on mobile */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0F172A] to-transparent z-10 pointer-events-none lg:hidden" />

          <nav
            aria-label="Help categories"
            className="rounded-2xl border border-[#334155] bg-[#1E293B] p-1.5 overflow-x-auto overscroll-x-contain lg:overflow-visible [-webkit-overflow-scrolling:touch]"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`nav[aria-label="Help categories"]::-webkit-scrollbar{display:none}`}</style>
            <p className="hidden lg:block px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
              Categories
            </p>
            <div className="flex lg:flex-col gap-1.5 min-w-max lg:min-w-0 snap-x snap-proximity lg:snap-none">
              {categories.map((cat) => {
                const isActive = activeSection === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => scrollToSection(cat.slug)}
                    aria-current={isActive ? "true" : undefined}
                    className={`snap-start flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all duration-200 min-h-[44px] lg:min-h-0 active:scale-[0.98] ${isActive
                        ? "bg-[#0F172A] text-white shadow-sm ring-1 ring-[#334155]"
                        : "text-[#94A3B8] hover:bg-[#0F172A]/50 hover:text-white active:bg-[#0F172A]/50 active:text-white"
                      }`}
                  >
                    <DynamicIcon
                      name={cat.icon}
                      size={16}
                      className={`shrink-0 ${isActive ? "text-[#e8bc69]" : ""}`}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className={`text-[11px] font-bold shrink-0 ${isActive ? "text-[#e8bc69]/70" : "text-[#475569]"}`}>
                      {cat.articles.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          {!isSearching && categories.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">All Sections</p>
              <button
                type="button"
                onClick={allExpanded ? collapseAll : expandAll}
                className="text-xs font-bold text-[#e8bc69] hover:underline py-1 px-1 rounded-lg"
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
            </div>
          )}

          {searchResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-8 text-center mt-2">
              <Search className="mx-auto h-10 w-10 text-[#475569] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No results found</h3>
              <p className="text-sm text-[#94A3B8] mb-5">
                We couldn't find anything matching "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchRef.current?.focus();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1E293B] border border-[#334155] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#334155] active:bg-[#334155] transition min-h-[44px]"
              >
                <X size={14} /> Clear Search
              </button>
            </div>
          ) : (
            searchResults.map(({ category, titleMatches, matchingArticles }) => {
              const isExpanded = isSearching || expandedSections.has(category.slug);
              const visibleArticles = isSearching && !titleMatches ? matchingArticles : category.articles;

              return (
                <div
                  key={category.id}
                  id={`help-${category.slug}`}
                  className={`scroll-mt-24 rounded-2xl border bg-[#1E293B] overflow-hidden transition-all duration-300 ${isExpanded
                      ? "border-[#e8bc69]/40 shadow-[0_4px_20px_-4px_rgba(232,188,105,0.1)]"
                      : "border-[#334155] hover:border-[#475569]"
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => !isSearching && toggleSection(category.slug)}
                    aria-expanded={isExpanded}
                    aria-controls={`help-panel-${category.slug}`}
                    disabled={isSearching}
                    className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left disabled:cursor-default"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 p-2 rounded-xl border bg-[#0F172A] border-[#334155] text-[#e8bc69]">
                        <DynamicIcon name={category.icon} size={18} />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-white truncate min-w-0">
                        <Highlight text={category.name} query={searchQuery} />
                      </h2>
                    </div>
                    {!isSearching && (
                      <ChevronDown
                        size={20}
                        className={`shrink-0 text-[#94A3B8] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""
                          }`}
                      />
                    )}
                  </button>

                  {isExpanded && (
                    <div id={`help-panel-${category.slug}`} className="px-4 sm:px-5 pb-5 pt-1">
                      <ul className="space-y-6 border-t border-[#334155] pt-5">
                        {visibleArticles.map((article) => (
                          <li key={article.id} className="space-y-3 min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-white break-words leading-snug">
                              <Highlight text={article.title} query={searchQuery} />
                            </h3>

                            {article.videoUrl && (
                              <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#334155] bg-black shadow-md">
                                <iframe
                                  src={article.videoUrl}
                                  title={article.title}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="h-full w-full"
                                />
                              </div>
                            )}

                            {/* Prose styling optimized for mobile (indented lists, proper line height) */}
                            <div
                              className="text-sm sm:text-base text-[#A0ABC0] leading-relaxed max-w-none break-words [word-break:break-word] prose prose-invert prose-sm sm:prose-base
                                prose-p:my-2.5 sm:prose-p:my-4
                                prose-headings:text-white prose-headings:font-bold
                                prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
                                prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                                prose-ul:my-3 prose-ul:pl-5 sm:prose-ul:pl-6
                                prose-ol:my-3 prose-ol:pl-5 sm:prose-ol:pl-6
                                prose-li:my-1 prose-li:pl-1
                                prose-a:text-[#e8bc69] prose-a:no-underline hover:prose-a:underline
                                prose-strong:text-white
                                prose-code:text-[#e8bc69] prose-code:bg-[#0F172A] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:[word-break:break-all]
                                prose-pre:bg-[#0F172A] prose-pre:border prose-pre:border-[#334155] prose-pre:rounded-xl prose-pre:p-3 prose-pre:text-xs
                                prose-img:rounded-xl prose-img:border prose-img:border-[#334155] prose-img:w-full prose-img:h-auto"
                              dangerouslySetInnerHTML={{ __html: article.content }}
                            />

                            {article.fileUrl && (
                              <div className="pt-1">
                                <a
                                  href={article.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] border border-[#334155] px-4 py-2.5 text-sm font-bold text-[#e8bc69] hover:bg-[#334155] active:bg-[#334155] transition w-full sm:w-auto min-h-[44px]"
                                >
                                  <FileText size={16} />
                                  Download Attached Document
                                </a>
                              </div>
                            )}

                            <div className="pt-2">
                              <Link
                                href={`/help/${category.slug}/${article.id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e8bc69]/10 border border-[#e8bc69]/30 px-4 py-2.5 text-sm font-bold text-[#e8bc69] hover:bg-[#e8bc69] hover:text-[#0F172A] active:bg-[#e8bc69] active:text-[#0F172A] transition-all w-full sm:w-auto min-h-[44px]"
                              >
                                <BookOpen size={16} />
                                Read full article
                                <ArrowRight size={16} className="ml-1 opacity-70" />
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {!isSearching && (
                        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[#334155] bg-[#0F172A]/50 px-4 py-3">
                          {feedback[category.id] ? (
                            <p className="text-sm font-bold text-[#94A3B8]">
                              Thanks for your feedback!
                            </p>
                          ) : (
                            <>
                              <p className="text-xs sm:text-sm font-bold text-[#94A3B8]">
                                Was this section helpful?
                              </p>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedback((prev) => ({ ...prev, [category.id]: "yes" }))
                                  }
                                  aria-label="Yes"
                                  className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 active:scale-95 transition-all"
                                >
                                  <ThumbsUp size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedback((prev) => ({ ...prev, [category.id]: "no" }))
                                  }
                                  aria-label="No"
                                  className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 active:scale-95 transition-all"
                                >
                                  <ThumbsDown size={16} />
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

      {/* ────────────────────── Footer CTA ────────────────────── */}
      <div className="mt-8 rounded-2xl border border-[#334155] bg-[#0F172A] p-5 sm:p-8 flex flex-col items-center text-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Still need help?</h3>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
            If you can't find the answer here, our support team is ready to assist you.
          </p>
        </div>
        <a
          href="mailto:support@cecit.edu.so"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E293B] border border-[#334155] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#334155] hover:text-[#e8bc69] active:bg-[#334155] active:text-[#e8bc69] w-full sm:w-auto min-h-[48px]"
        >
          <Mail size={18} /> Contact Support
        </a>
      </div>
    </div>
  );
}
