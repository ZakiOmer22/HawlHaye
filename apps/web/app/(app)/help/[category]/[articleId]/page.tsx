"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Printer,
  Share2,
  FileText,
  ChevronRight,
  Check,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Calendar,
  User,
  ArrowRight,
  LayoutList,
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

export default function HelpArticleDetailPage() {
  const { category: categorySlug, articleId } = useParams<{
    category: string;
    articleId: string;
  }>();

  const [categories, setCategories] = useState<HelpCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Fetch all help data
  useEffect(() => {
    api<{ data: HelpCategory[] }>("/help")
      .then((res) => setCategories(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load article"));
  }, []);

  // Reset state on navigation
  useEffect(() => {
    setFeedback(null);
    setCopied(false);
    window.scrollTo(0, 0);
  }, [categorySlug, articleId]);

  // Handle reading progress and back-to-top visibility
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Find current article, related data, and prev/next
  const { article, category, relatedArticles, prevArticle, nextArticle } = useMemo(() => {
    if (!categories)
      return {
        article: null,
        category: null,
        relatedArticles: [],
        prevArticle: null,
        nextArticle: null,
      };
    const cat = categories.find((c) => c.slug === categorySlug);
    if (!cat)
      return {
        article: null,
        category: null,
        relatedArticles: [],
        prevArticle: null,
        nextArticle: null,
      };

    const currentIndex = cat.articles.findIndex((a) => a.id === articleId);
    if (currentIndex === -1)
      return {
        article: null,
        category: null,
        relatedArticles: [],
        prevArticle: null,
        nextArticle: null,
      };

    const art = cat.articles[currentIndex];
    const related = cat.articles.filter((a) => a.id !== articleId).slice(0, 3);
    const prev = currentIndex > 0 ? cat.articles[currentIndex - 1] : null;
    const next = currentIndex < cat.articles.length - 1 ? cat.articles[currentIndex + 1] : null;

    return {
      article: art,
      category: cat,
      relatedArticles: related,
      prevArticle: prev,
      nextArticle: next,
    };
  }, [categories, categorySlug, articleId]);

  // Calculate reading time
  const readingTime = useMemo(() => {
    if (!article) return 0;
    const text = article.content.replace(/<[^>]*>?/gm, "");
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [article]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center p-4">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2">Article not found</h1>
          <p className="text-secondary mb-6">{error}</p>
          <Link
            href="/help"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-text hover:bg-accent-hover transition shadow-sm"
          >
            Back to Help Center
          </Link>
        </div>
      </div>
    );
  }

  if (!categories || !article || !category) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto min-h-screen bg-app pb-24 relative">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[200] bg-transparent pointer-events-none">
        <div
          className="h-full bg-accent transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-10 max-w-[1200px] mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center flex-wrap gap-2 text-sm text-muted mb-8">
          <Link
            href="/help"
            className="hover:text-accent transition-colors flex items-center gap-1.5"
          >
            Help Center
          </Link>
          <ChevronRight size={14} className="opacity-50" />
          <Link
            href={`/help#${category.slug}`}
            className="hover:text-accent transition-colors flex items-center gap-1.5"
          >
            <DynamicIcon name={category.icon} size={14} />
            {category.name}
          </Link>
        </nav>

        <div className="grid lg:grid-cols-[260px_1fr] gap-10 xl:gap-16 items-start">
          {/* Sticky Sidebar (Desktop Only) */}
          <aside className="hidden lg:block sticky top-24 self-start max-h-[calc(100dvh-8rem)] overflow-y-auto custom-scrollbar pr-4">
            <div className="mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-2 mb-4">
                <LayoutList size={16} className="text-accent" /> In this Category
              </h3>
              <nav className="space-y-1">
                {category.articles.map((a) => {
                  const isActive = a.id === articleId;
                  return (
                    <Link
                      key={a.id}
                      href={`/help/${category.slug}/${a.id}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-accent/10 font-bold text-accent"
                          : "text-secondary hover:bg-panel hover:text-primary"
                      }`}
                    >
                      {a.title}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-border mt-6">
              <Link
                href="/help"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-bold text-primary hover:bg-panel-hover transition-colors"
              >
                <ArrowLeft size={16} /> Back to Help Center
              </Link>
            </div>
          </aside>

          {/* Main Article Content */}
          <article className="min-w-0">
            {/* Header */}
            <header className="space-y-6 mb-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-bold text-accent">
                  <DynamicIcon name={category.icon} size={14} />
                  {category.name}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-panel border border-border px-3 py-1 text-xs font-bold text-secondary">
                  <Clock size={14} /> {readingTime} min read
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-panel border border-border px-3 py-1 text-xs font-bold text-secondary">
                  <Calendar size={14} /> Updated recently
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-primary leading-[1.1] tracking-tight">
                {article.title}
              </h1>

              <div className="flex items-center justify-between border-y border-border py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-panel border border-border flex items-center justify-center text-xs font-black text-secondary">
                      <User size={14} />
                    </div>
                    <span className="text-sm font-bold text-primary hidden sm:inline">
                      CECIT Support
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border hidden sm:block" />
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors"
                  >
                    {copied ? (
                      <Check size={16} className="text-emerald-500" />
                    ) : (
                      <Share2 size={16} />
                    )}
                    {copied ? "Copied!" : "Share"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors"
                  >
                    <Printer size={16} /> Print
                  </button>
                </div>
              </div>
            </header>

            {/* Video Embed */}
            {article.videoUrl && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black shadow-xl mb-10">
                <iframe
                  src={article.videoUrl}
                  title={article.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}

            {/* Main Content (Prose) */}
            <div className="py-2">
              <div
                className="text-base sm:text-lg text-secondary leading-relaxed max-w-none break-words [word-break:break-word] prose prose-invert prose-base sm:prose-lg overflow-x-auto
                  prose-p:my-4 sm:prose-p:my-6
                  prose-headings:text-primary prose-headings:font-black prose-headings:tracking-tight
                  prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
                  prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                  prose-ul:my-4 prose-ul:pl-6
                  prose-ol:my-4 prose-ol:pl-6
                  prose-li:my-1.5 prose-li:pl-1
                  prose-a:text-accent prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-primary
                  prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:bg-panel prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-primary
                  prose-code:text-accent prose-code:bg-panel prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-code:[word-break:break-all]
                  prose-pre:bg-panel prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-5 prose-pre:text-sm prose-pre:shadow-sm
                  prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:w-full prose-img:h-auto prose-img:shadow-md"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>

            {/* Attachments */}
            {article.fileUrl && (
              <div className="mt-10 rounded-2xl border border-border bg-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10 text-accent">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary">Attached Document</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Download the supplementary file for this article.
                    </p>
                  </div>
                </div>
                <a
                  href={article.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-app border border-border px-5 py-2.5 text-sm font-bold text-primary hover:bg-panel-hover transition-colors w-full sm:w-auto shadow-sm"
                >
                  Download File
                </a>
              </div>
            )}

            {/* Prev / Next Navigation */}
            <div className="mt-12 grid sm:grid-cols-2 gap-4">
              {prevArticle ? (
                <Link
                  href={`/help/${category.slug}/${prevArticle.id}`}
                  className="group flex flex-col justify-center rounded-2xl border border-border bg-panel p-5 hover:border-accent/40 hover:bg-app transition-all"
                >
                  <span className="text-xs font-bold text-muted flex items-center gap-1 mb-1">
                    <ArrowLeft size={12} /> Previous
                  </span>
                  <span className="text-sm font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                    {prevArticle.title}
                  </span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}

              {nextArticle ? (
                <Link
                  href={`/help/${category.slug}/${nextArticle.id}`}
                  className="group flex flex-col justify-center items-end text-right rounded-2xl border border-border bg-panel p-5 hover:border-accent/40 hover:bg-app transition-all"
                >
                  <span className="text-xs font-bold text-muted flex items-center gap-1 mb-1">
                    Next <ArrowRight size={12} />
                  </span>
                  <span className="text-sm font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                    {nextArticle.title}
                  </span>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            {/* Feedback */}
            <div className="mt-12 rounded-2xl border border-border bg-panel p-8 text-center flex flex-col items-center shadow-sm">
              {feedback ? (
                <div className="animate-in fade-in zoom-in duration-300">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 mx-auto">
                    <ThumbsUp size={28} />
                  </div>
                  <h3 className="text-xl font-black text-primary mb-2">
                    Thanks for your feedback!
                  </h3>
                  <p className="text-sm text-secondary">
                    We're glad this article was helpful to you.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-black text-primary mb-2">
                    Was this article helpful?
                  </h3>
                  <p className="text-sm text-secondary mb-6">
                    Your feedback helps us improve our documentation.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setFeedback("yes")}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-app border border-border px-6 py-3 text-sm font-bold text-primary hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all active:scale-95"
                    >
                      <ThumbsUp size={16} /> Yes, it helped
                    </button>
                    <button
                      onClick={() => setFeedback("no")}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-app border border-border px-6 py-3 text-sm font-bold text-primary hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-95"
                    >
                      <ThumbsDown size={16} /> No, it needs work
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-16 pt-8 border-t border-border">
                <h2 className="text-lg font-black text-primary mb-6 flex items-center gap-2">
                  <BookOpen size={20} className="text-accent" /> Related Articles
                </h2>
                <div className="grid gap-3">
                  {relatedArticles.map((r) => (
                    <Link
                      key={r.id}
                      href={`/help/${category.slug}/${r.id}`}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-panel p-4 hover:border-accent/40 hover:bg-app transition-all"
                    >
                      <h3 className="text-sm font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                        {r.title}
                      </h3>
                      <ChevronRight
                        size={16}
                        className="text-muted group-hover:text-accent transition-colors shrink-0"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
