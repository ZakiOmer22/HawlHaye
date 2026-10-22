import Link from "next/link";
import { Logo } from "../ui/Logo";
import { SponsoredByUOH } from "./SponsoredByUOH";
import { PoweredBy } from "./PoweredBy";

const footerSections = [
  {
    title: "Platform",
    links: [
      { name: "Task Board", href: "/board" },
      { name: "Dashboard", href: "/dashboard" },
      { name: "Reports", href: "/reports" },
      { name: "Review Queue", href: "/review" },
      { name: "My Tasks", href: "/my-tasks" },
    ],
  },
  {
    title: "Administration",
    links: [
      { name: "Users & Roles", href: "/admin/users" },
      { name: "Offices", href: "/admin/offices" },
      { name: "Audit Trail", href: "/reports/system" },
      { name: "Security", href: "/security" },
      { name: "API Status", href: "/status" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Help Center", href: "/help" },
      { name: "Training Videos", href: "/training" },
      { name: "Documentation", href: "/docs" },
      { name: "Guides", href: "/guides" },
      { name: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "Accessibility", href: "/accessibility" },
    ],
  },
];

export function Footer() {
  return (
    <>
      <footer className="bg-[#0B132B] text-white pt-20 pb-12 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#e8bc69]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Main Grid - Expanded first col to col-span-2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 mb-16">
            {/* Brand Col */}
            <div className="lg:col-span-2 pr-4">
              <Logo size="lg" href="/" />
              <p className="mt-6 text-sm leading-relaxed text-[#A0ABC0] max-w-sm">
                An institutional task and workflow management platform designed to bring clarity,
                accountability, and structure to University operations.
              </p>
            </div>

            {/* Links Cols */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-extrabold text-white mb-6 uppercase tracking-widest">
                  {section.title}
                </h3>
                <ul className="space-y-4">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-[#A0ABC0] transition-all duration-300 hover:text-[#e8bc69] hover:translate-x-1 inline-block"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Download App Banner */}
          <div className="bg-[#1C2541] rounded-3xl p-8 md:p-12 mb-16 border border-[#2A3754] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#e8bc69]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
              <div className="text-center md:text-left">
                <h3 className="text-3xl font-black mb-3 text-white">Get the HAWLHAYE App</h3>
                <p className="text-[#A0ABC0] text-base max-w-lg leading-relaxed">
                  Install HAWLHAYE on your device as a PWA. Add it to your home screen for quick
                  access, offline support, and a native app feel.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <button className="flex h-14 items-center justify-center gap-2 rounded-xl bg-white px-8 font-bold text-[#0B132B] transition hover:bg-slate-200 hover:scale-105">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Install for iOS
                </button>
                <button className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-[#2A3754] bg-[#0B132B] px-8 font-bold text-white transition hover:border-[#e8bc69] hover:text-[#e8bc69] hover:scale-105">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Install for Android
                </button>
              </div>
            </div>
          </div>

          {/* Social & Contact */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-t border-[#1C2541] pt-10">
            <div className="flex flex-col sm:flex-row items-center gap-8 text-sm font-medium text-[#A0ABC0]">
              <span>support@cecit.edu.so</span>
              <span>+252 63 123 4567</span>
            </div>

            <div className="flex gap-4">
              {["Facebook", "Twitter", "LinkedIn", "Instagram"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-11 h-11 bg-[#1C2541] border border-[#2A3754] rounded-xl flex items-center justify-center text-[#A0ABC0] transition-all duration-300 hover:bg-[#e8bc69] hover:text-[#0B132B] hover:-translate-y-1 hover:border-[#e8bc69]"
                  aria-label={`Follow us on ${social}`}
                >
                  <span className="sr-only">{social}</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center text-xs font-medium text-[#A0ABC0]/60 mt-10">
            <p>© {new Date().getFullYear()} HAWLHAYE. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      {/* Separated Sections as requested */}
      <SponsoredByUOH />
      <PoweredBy />
    </>
  );
}
