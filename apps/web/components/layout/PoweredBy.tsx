import Image from "next/image";

/**
 * "Powered by eALIF" bar.
 * `data-force-dark` opts this subtree out of every light-mode override
 * in globals.css — the bar stays dark in both themes.
 */
export function PoweredBy() {
  return (
    <footer
      data-force-dark
      className="group relative w-full overflow-hidden border-t border-[#1C2541] bg-[#0B132B] text-white"
    >
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-30" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="relative rounded-xl border border-[#2A3754] bg-[#1C2541] p-2.5 shadow-lg">
            <Image alt="eALIF Team Logo" width={28} height={28} src="/logo.png" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-white">
              Powered by <span className="text-[#e8bc69]">eALIF Team</span>
            </span>
            <span className="text-sm font-medium text-[#A0ABC0]">
              Transforming Education Through Technology
            </span>
          </div>
        </div>

        {/* Links + version pill */}
        <div className="flex items-center gap-8 text-sm">
          <div className="hidden items-center gap-6 md:flex">
            <a
              className="font-semibold text-[#A0ABC0] transition-colors duration-200 hover:text-[#e8bc69] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] rounded px-1"
              href="#"
            >
              About Us
            </a>
            <div className="h-4 w-px bg-[#2A3754]" aria-hidden="true" />
            <a
              className="font-semibold text-[#A0ABC0] transition-colors duration-200 hover:text-[#e8bc69] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e8bc69] rounded px-1"
              href="#"
            >
              Contact
            </a>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#2A3754] bg-[#1C2541] px-4 py-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full bg-emerald-400 motion-safe:animate-pulse"
              aria-hidden="true"
            />
            <span className="font-mono text-xs font-bold tracking-widest text-[#A0ABC0]">
              v2.1.0
            </span>
          </div>
        </div>
      </div>

      {/* Bottom edge — the only element that responds to hover */}
      <div className="relative h-[3px] overflow-hidden bg-[#1C2541]">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#e8bc69] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-70" />
      </div>
    </footer>
  );
}
