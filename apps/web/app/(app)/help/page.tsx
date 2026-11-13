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
  Sparkles,
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
      <mark className="rounded bg-accent/25 px-0.5 text-accent">
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
              (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q),
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
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto overflow-x-hidden px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-8 pb-[calc(4rem+env(safe-area-inset-bottom))] [-webkit-tap-highlight-color:transparent]">
      {/* ────────────────────── Hero ────────────────────── */}
      <section className="w-full text-center max-w-3xl mx-auto pt-4 pb-2">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-panel border border-border mb-6 shadow-lg shadow-black/5">
          <LifeBuoy className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-primary mb-4 leading-tight tracking-tight">
          How can we <span className="text-accent">help</span> you?
        </h1>
        <p className="text-secondary text-sm sm:text-base mb-8 px-2 max-w-xl mx-auto">
          Search for guides, watch training videos, and master the HAWLHAYE platform.
        </p>

        <div className="relative w-full max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search for guides, features, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search help articles"
            className="w-full rounded-2xl border border-border bg-panel py-4 pl-12 pr-14 text-base text-primary placeholder-muted outline-none transition-all duration-200 focus:border-accent focus:ring-4 focus:ring-accent/10 shadow-xl"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-xl text-muted hover:bg-app hover:text-primary active:bg-app active:text-primary transition"
            >
              <X size={18} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-7 items-center rounded-lg border border-border bg-app px-2 font-mono text-[11px] font-bold text-muted">
              /
            </kbd>
          )}
        </div>
      </section>

      {/* ────────────────────── Layout ────────────────────── */}
      <div className="grid lg:grid-cols-[260px_1fr] gap-6 sm:gap-8 mt-4 w-full">
        {/* Sidebar Navigation - Fix: Added min-w-0 and w-full to prevent grid blowout */}
        <aside className="w-full min-w-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto relative custom-scrollbar">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-app to-transparent z-10 pointer-events-none lg:hidden" />

          <nav
            aria-label="Help categories"
            className="w-full rounded-2xl border border-border bg-panel p-2 overflow-x-auto overscroll-x-contain lg:overflow-visible [-webkit-overflow-scrolling:touch]"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`nav[aria-label="Help categories"]::-webkit-scrollbar{display:none}`}</style>
            <p className="hidden lg:block px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted">
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
                    className={`snap-start flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all duration-200 min-h-[44px] lg:min-h-0 active:scale-[0.98] ${
                      isActive
                        ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                        : "text-secondary hover:bg-app hover:text-primary"
                    }`}
                  >
                    <DynamicIcon
                      name={cat.icon}
                      size={16}
                      className={`shrink-0 ${isActive ? "text-accent" : "text-muted"}`}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span
                      className={`text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-full ${isActive ? "bg-accent/20 text-accent" : "bg-app text-muted"}`}
                    >
                      {cat.articles.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content - Fix: Ensured min-w-0 and w-full */}
        <main className="w-full min-w-0 space-y-5">
          {!isSearching && categories.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-secondary flex items-center gap-2">
                <Sparkles size={16} className="text-accent" /> All Sections
              </h2>
              <button
                type="button"
                onClick={allExpanded ? collapseAll : expandAll}
                className="text-xs font-bold text-accent hover:underline py-1.5 px-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
            </div>
          )}

          {searchResults.length === 0 ? (
            <div className="w-full rounded-3xl border border-dashed border-border bg-panel/50 p-10 sm:p-16 text-center mt-2">
              <Search className="mx-auto h-12 w-12 text-muted opacity-50 mb-4" />
              <h3 className="text-lg font-bold text-primary mb-2">No results found</h3>
              <p className="text-sm text-secondary mb-6">
                We couldn't find anything matching "
                <span className="text-primary font-bold">{searchQuery}</span>"
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchRef.current?.focus();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition shadow-sm"
              >
                <X size={14} /> Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {searchResults.map(({ category, titleMatches, matchingArticles }) => {
                const isExpanded = isSearching || expandedSections.has(category.slug);
                const visibleArticles =
                  isSearching && !titleMatches ? matchingArticles : category.articles;

                return (
                  <div
                    key={category.id}
                    id={`help-${category.slug}`}
                    className={`w-full scroll-mt-24 rounded-2xl border bg-panel overflow-hidden transition-all duration-300 ${
                      isExpanded
                        ? "border-accent/40 shadow-lg shadow-accent/5"
                        : "border-border hover:border-accent/30"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !isSearching && toggleSection(category.slug)}
                      aria-expanded={isExpanded}
                      aria-controls={`help-panel-${category.slug}`}
                      disabled={isSearching}
                      className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left disabled:cursor-default hover:bg-app/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={`shrink-0 p-3 rounded-2xl border transition-colors ${isExpanded ? "bg-accent/10 border-accent/30 text-accent" : "bg-app border-border text-muted"}`}
                        >
                          <DynamicIcon name={category.icon} size={22} />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-lg font-black text-primary truncate min-w-0">
                            <Highlight text={category.name} query={searchQuery} />
                          </h2>
                          <p className="text-xs text-muted mt-1">
                            {category.articles.length}{" "}
                            {category.articles.length === 1 ? "article" : "articles"}
                          </p>
                        </div>
                      </div>
                      {!isSearching && (
                        <div
                          className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-app border border-border transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <ChevronDown size={20} className="text-muted" />
                        </div>
                      )}
                    </button>

                    {isExpanded && (
                      <div
                        id={`help-panel-${category.slug}`}
                        className="w-full px-5 sm:px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300"
                      >
                        <div className="border-t border-border pt-6 space-y-6">
                          {visibleArticles.map((article) => (
                            <div key={article.id} className="space-y-3 min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-primary break-words leading-snug">
                                <Highlight text={article.title} query={searchQuery} />
                              </h3>

                              {article.videoUrl && (
                                <div className="aspect-video w-full rounded-xl overflow-hidden border border-border bg-black shadow-sm">
                                  <iframe
                                    src={article.videoUrl}
                                    title={article.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="h-full w-full"
                                  />
                                </div>
                              )}

                              {/* Fix: Added overflow-x-auto to handle long code blocks/tables inside prose */}
                              <div
                                className="w-full text-sm text-secondary leading-relaxed max-w-none break-words [word-break:break-word] prose prose-invert prose-sm sm:prose-base overflow-x-auto
                                  prose-p:my-2 sm:prose-p:my-3
                                  prose-headings:text-primary prose-headings:font-bold
                                  prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
                                  prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                                  prose-ul:my-3 prose-ul:pl-5 sm:prose-ul:pl-6
                                  prose-ol:my-3 prose-ol:pl-5 sm:prose-ol:pl-6
                                  prose-li:my-1 prose-li:pl-1
                                  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                                  prose-strong:text-primary
                                  prose-code:text-accent prose-code:bg-app prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:[word-break:break-all]
                                  prose-pre:bg-app prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-3 prose-pre:text-xs
                                  prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:w-full prose-img:h-auto"
                                dangerouslySetInnerHTML={{ __html: article.content }}
                              />

                              {article.fileUrl && (
                                <div className="pt-1">
                                  <a
                                    href={article.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-app border border-border px-4 py-2.5 text-sm font-bold text-accent hover:bg-panel-hover active:bg-panel-hover transition w-full sm:w-auto min-h-[44px]"
                                  >
                                    <FileText size={16} />
                                    Download Attached Document
                                  </a>
                                </div>
                              )}

                              <div className="pt-2">
                                <Link
                                  href={`/help/${category.slug}/${article.id}`}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent/10 border border-accent/30 px-4 py-2.5 text-sm font-bold text-accent hover:bg-accent hover:text-accent-text active:bg-accent active:text-accent-text transition-all w-full sm:w-auto min-h-[44px]"
                                >
                                  <BookOpen size={16} />
                                  Read full article
                                  <ArrowRight size={16} className="ml-1 opacity-70" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>

                        {!isSearching && (
                          <div className="w-full mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-app/50 px-4 py-3">
                            {feedback[category.id] ? (
                              <p className="text-sm font-bold text-secondary">
                                Thanks for your feedback!
                              </p>
                            ) : (
                              <>
                                <p className="text-xs sm:text-sm font-bold text-secondary">
                                  Was this section helpful?
                                </p>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFeedback((prev) => ({ ...prev, [category.id]: "yes" }))
                                    }
                                    aria-label="Yes"
                                    className="flex items-center justify-center h-10 w-10 rounded-lg bg-panel border border-border text-muted hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 active:scale-95 transition-all"
                                  >
                                    <ThumbsUp size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFeedback((prev) => ({ ...prev, [category.id]: "no" }))
                                    }
                                    aria-label="No"
                                    className="flex items-center justify-center h-10 w-10 rounded-lg bg-panel border border-border text-muted hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 active:scale-95 transition-all"
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
              })}
            </div>
          )}
        </main>
      </div>

      {/* ────────────────────── Footer CTA ────────────────────── */}
      <div className="w-full mt-12 rounded-3xl border border-border bg-panel p-6 sm:p-10 flex flex-col items-center text-center gap-5">
        <div>
          <h3 className="text-xl font-black text-primary mb-2">Still need help?</h3>
          <p className="text-sm text-secondary max-w-md mx-auto">
            If you can't find the answer here, our support team is ready to assist you.
          </p>
        </div>
        <a
          href="mailto:support@cecit.edu.so"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-accent-text hover:bg-accent-hover active:bg-accent-hover transition-all shadow-sm w-full sm:w-auto min-h-[48px]"
        >
          <Mail size={18} /> Contact Support
        </a>
      </div>
    </div>
  );
}
