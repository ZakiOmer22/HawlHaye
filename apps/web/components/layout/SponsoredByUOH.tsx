import Image from "next/image";
import { FaFacebookF } from "react-icons/fa";

export function SponsoredByUOH() {
  return (
    <div className="w-full bg-app-soft px-6 py-12 flex justify-center border-t border-border">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-accent/40 bg-panel/60 p-8 backdrop-blur-md transition-all hover:border-accent/80 hover:shadow-[0_0_40px_rgba(232,188,105,0.15)] group">
        {/* Decorative corners */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 rounded-tl border-accent/70 transition-all group-hover:scale-110" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 rounded-tr border-accent/70 transition-all group-hover:scale-110" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 rounded-bl border-accent/70 transition-all group-hover:scale-110" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 rounded-br border-accent/70 transition-all group-hover:scale-110" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 px-2">
          {/* Left: Logo + Text */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 relative">
              <Image
                src="/uoh.png"
                alt="University of Hargeisa Logo"
                width={70}
                height={70}
                // No background, no border — the logo sits cleanly on the card.
                // If the PNG has a baked-in white background, regenerate it with
                // transparency (a proper crest should not have a background).
                className="transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
              <span className="font-extrabold text-lg text-primary tracking-wide">
                University of Hargeisa
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-accent uppercase tracking-widest">
                  Official Sponsor
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-accent/50" />
                <span className="text-sm font-medium text-muted">CECIT Partner</span>
              </div>
            </div>
          </div>

          {/* Right: Facebook Icon */}
          <a
            href="https://www.facebook.com/Jaamacadda.Hargaysa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-app-soft border border-border text-muted transition-all hover:bg-accent hover:text-accent-text hover:scale-110 hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="University of Hargeisa Facebook"
          >
            <FaFacebookF className="text-xl" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
