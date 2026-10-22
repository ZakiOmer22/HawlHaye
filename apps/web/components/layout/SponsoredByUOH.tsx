import Image from "next/image";
import { FaFacebookF } from "react-icons/fa";

export function SponsoredByUOH() {
  return (
    <div className="w-full bg-[#0B132B] px-6 py-12 flex justify-center border-t border-[#1C2541]">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e8bc69]/40 bg-[#1C2541]/60 p-8 backdrop-blur-md transition-all hover:border-[#e8bc69]/80 hover:shadow-[0_0_40px_rgba(232,188,105,0.15)] group">
        {/* Decorative corners */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 rounded-tl border-[#e8bc69]/70 transition-all group-hover:scale-110"></div>
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 rounded-tr border-[#e8bc69]/70 transition-all group-hover:scale-110"></div>
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 rounded-bl border-[#e8bc69]/70 transition-all group-hover:scale-110"></div>
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 rounded-br border-[#e8bc69]/70 transition-all group-hover:scale-110"></div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 px-2">
          {/* Left: Logo + Text */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 relative">
              <Image
                src="/uoh.png"
                alt="University of Hargeisa Logo"
                width={70}
                height={70}
                // Changed to rounded-xl so the shield logo isn't clipped
                className="rounded-xl border-2 border-[#e8bc69]/50 bg-white p-1.5 transition-transform duration-300 group-hover:scale-105 group-hover:border-[#e8bc69]"
              />
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
              <span className="font-extrabold text-lg text-white tracking-wide">
                University of Hargeisa
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#e8bc69] uppercase tracking-widest">
                  Official Sponsor
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#e8bc69]/50"></span>
                <span className="text-sm font-medium text-[#A0ABC0]">CECIT Partner</span>
              </div>
            </div>
          </div>

          {/* Right: Facebook Icon */}
          <a
            href="https://www.facebook.com/Jaamacadda.Hargaysa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0B132B] border border-[#1C2541] text-[#A0ABC0] transition-all hover:bg-[#e8bc69] hover:text-[#0B132B] hover:scale-110 hover:border-[#e8bc69]"
            aria-label="University of Hargeisa Facebook"
          >
            <FaFacebookF className="text-xl" />
          </a>
        </div>
      </div>
    </div>
  );
}
