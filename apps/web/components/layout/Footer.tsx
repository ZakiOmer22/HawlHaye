import Link from "next/link";
import { Logo } from "../ui/Logo";
// import { SponsoredByUOH } from "./SponsoredByUOH";
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

const socialIcons: Record<string, string> = {
  Facebook:
    "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z",
  Twitter:
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  LinkedIn:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  Instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
};

export function Footer() {
  return (
    <>
      <footer className="relative overflow-hidden bg-app-soft pb-12 pt-20 text-primary">
        <div className="pointer-events-none absolute right-1/4 top-0 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
            <div className="pr-4 lg:col-span-2">
              <Logo size="lg" href="/" />
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
                An institutional task and workflow management platform designed to bring clarity,
                accountability, and structure to University operations.
              </p>
            </div>

            {footerSections.map((section) => (
              <nav key={section.title} aria-labelledby={`footer-${section.title}`}>
                <h3
                  id={`footer-${section.title}`}
                  className="mb-6 text-sm font-extrabold uppercase tracking-widest text-primary"
                >
                  {section.title}
                </h3>
                <ul className="space-y-4">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="inline-block rounded px-1 text-sm font-medium text-muted transition-all duration-300 hover:translate-x-1 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rtl:hover:-translate-x-1"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Download App Banner */}
          <div className="relative mb-16 overflow-hidden rounded-3xl border border-border-strong bg-panel p-8 shadow-2xl md:p-12">
            <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-between gap-10 md:flex-row">
              <div className="text-center md:text-left">
                <h3 className="mb-3 text-3xl font-black text-primary">Get the HAWLHAYE App</h3>
                <p className="max-w-lg text-base leading-relaxed text-muted">
                  Install HAWLHAYE on your device as a PWA. Add it to your home screen for quick
                  access, offline support, and a native app feel.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-8 font-bold text-app transition hover:scale-105 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                >
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Install for iOS
                </button>
                <button
                  type="button"
                  className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-app-soft px-8 font-bold text-primary transition hover:scale-105 hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
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

          {/* Contact + social */}
          <div className="flex flex-col items-center justify-between gap-8 border-t border-border pt-10 md:flex-row">
            <div className="flex flex-col items-center gap-8 text-sm font-medium text-muted sm:flex-row">
              <span>support@cecit.edu.so</span>
              <span>+252 63 123 4567</span>
            </div>

            <div className="flex gap-4">
              {Object.keys(socialIcons).map((social) => (
                <a
                  key={social}
                  href="#"
                  aria-label={`Follow us on ${social}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-panel text-muted transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:bg-accent hover:text-accent-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="sr-only">{social}</span>
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d={socialIcons[social]} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
      <PoweredBy />
    </>
  );
}
