import Link from "next/link";
import { Logo } from "../ui/Logo";

export function Navbar() {
  return (
    <header className="sticky top-0 z-[100] w-full border-b border-[#1e1e35] bg-[#080810]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo size="md" href="/" />

        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#8888aa] md:flex">
          <a className="transition hover:text-[#e8bc69]" href="#features">
            Features
          </a>
          <a className="transition hover:text-[#e8bc69]" href="#process">
            Process
          </a>
          <a className="transition hover:text-[#e8bc69]" href="#showcase">
            Showcase
          </a>
          <a className="transition hover:text-[#e8bc69]" href="#testimonials">
            Testimonials
          </a>
          <a className="transition hover:text-[#e8bc69]" href="#faq">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-bold text-[#f5f5f0] transition hover:text-[#e8bc69] sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-[#e8bc69] px-5 py-2.5 text-sm font-bold text-[#080810] shadow-[0_0_20px_rgba(232,188,105,0.2)] transition hover:-translate-y-0.5 hover:bg-[#f1cf8b] hover:shadow-[0_0_30px_rgba(232,188,105,0.4)]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
