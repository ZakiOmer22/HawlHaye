"use client";

import { useState } from "react";
import {
  BookOpen,
  GitPullRequest,
  Users,
  ShieldCheck,
  Search,
  LifeBuoy,
  ChevronDown,
  Mail,
} from "lucide-react";

const HELP_SECTIONS = [
  {
    icon: BookOpen,
    title: "Getting Started",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    items: [
      "Sign in with your CECIT credentials provided by the administrator.",
      "Your role automatically controls which pages and actions you can access.",
      "Open the Board to see every task in the institutional workflow.",
      "Use 'My Tasks' to see only what is currently assigned to you.",
    ],
  },
  {
    icon: GitPullRequest,
    title: "Workflow & Statuses",
    color: "text-[#e8bc69]",
    bg: "bg-[#e8bc69]/10 border-[#e8bc69]/20",
    items: [
      "Assigned → In Progress: The owner clicks 'Start Work' to begin.",
      "In Progress → Review: Submit the task for leadership approval.",
      "Review → Completed: Only the Dean or Deputy can approve and finalize.",
      "Any Stage → Blocked: You must provide a reason before blocking a task.",
    ],
  },
  {
    icon: Users,
    title: "Delegation",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    items: [
      "Only the current owner of a task can delegate it to someone else.",
      "The delegate must accept the request before they become the new owner.",
      "All delegation requests and acceptances are logged in the task history.",
      "You can decline a delegation if you do not have the capacity.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Audit & Security",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    items: [
      "Every action (creation, status change, comment) is permanently logged.",
      "The task history preserves exactly who changed what and when.",
      "CSV data exports are available on the Reports page for leadership.",
      "Security events (like failed logins) are monitored by administrators.",
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("Getting Started");

  // Filter sections based on search query
  const filteredSections = HELP_SECTIONS.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.items.some((item) => item.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto pt-6 pb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E293B] border border-[#334155] mb-6 shadow-xl shadow-black/20">
          <LifeBuoy className="h-8 w-8 text-[#e8bc69]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">How can we help?</h1>
        <p className="text-[#94A3B8] text-lg">
          Search our knowledge base or browse the categories below to learn how to use HAWLHAYE.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-[#94A3B8]" />
        </div>
        <input
          type="text"
          placeholder="Search for answers (e.g., 'delegate', 'blocked', 'approve')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-[#334155] bg-[#1E293B] py-4 pl-12 pr-4 text-white placeholder-[#94A3B8] outline-none transition focus:border-[#e8bc69] focus:ring-1 focus:ring-[#e8bc69] shadow-lg"
        />
      </div>

      {/* Help Sections */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        {filteredSections.length === 0 ? (
          <div className="col-span-2 rounded-3xl border border-dashed border-[#334155] bg-[#1E293B]/50 p-16 text-center">
            <Search className="mx-auto h-12 w-12 text-[#475569] mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No results found</h3>
            <p className="text-sm text-[#94A3B8]">
              We couldn't find anything matching "{searchQuery}". Try a different keyword.
            </p>
          </div>
        ) : (
          filteredSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.title || searchQuery.length > 0;

            return (
              <div
                key={section.title}
                className={`rounded-2xl border bg-[#1E293B] overflow-hidden transition-all duration-300 ${
                  isExpanded
                    ? "border-[#e8bc69]/40 shadow-[0_4px_20px_-4px_rgba(232,188,105,0.1)]"
                    : "border-[#334155] hover:border-[#475569]"
                }`}
              >
                <button
                  onClick={() =>
                    setExpandedSection(
                      isExpanded && searchQuery.length === 0 ? null : section.title,
                    )
                  }
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl border ${section.bg} ${section.color}`}>
                      <Icon size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  </div>
                  {searchQuery.length === 0 && (
                    <ChevronDown
                      size={20}
                      className={`text-[#94A3B8] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-0">
                    <ul className="space-y-3 border-t border-[#334155] pt-4 mt-2">
                      {section.items.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm text-[#A0ABC0] leading-relaxed"
                        >
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${section.color}`}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contact Support CTA */}
      <div className="mt-12 rounded-3xl border border-[#334155] bg-[#0F172A] p-8 text-center flex flex-col items-center">
        <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
        <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto">
          If you couldn't find the answer you were looking for, please reach out to the CECIT IT
          Support team.
        </p>
        <a
          href="mailto:support@cecit.edu.so"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1E293B] border border-[#334155] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#334155] hover:text-[#e8bc69]"
        >
          <Mail size={18} /> Contact Support
        </a>
      </div>
    </div>
  );
}
