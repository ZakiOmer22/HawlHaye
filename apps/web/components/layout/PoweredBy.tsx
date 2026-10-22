export function PoweredBy() {
  return (
    <footer className="w-full bg-[#0B132B] text-white relative overflow-hidden border-t border-[#1C2541]">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] opacity-30 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 group transition-all duration-500">
          <div className="relative transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3">
            <div className="relative p-2.5 rounded-xl bg-[#1C2541] border border-[#2A3754] shadow-lg">
              {/* eALIF Logo Icon */}
              <img
                alt="eALIF Team Logo"
                loading="lazy"
                width="28"
                height="28"
                className="transition-all duration-500 group-hover:brightness-125 brightness-100"
                src="/logo.png"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl text-white">
              Powered by <span className="text-[#e8bc69]">eALIF Team</span>
            </span>
            <span className="text-sm text-[#A0ABC0] font-medium transition-all duration-500 group-hover:text-white">
              Transforming Education Through Technology
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8 text-sm">
          <div className="hidden md:flex items-center gap-6">
            <a
              className="text-[#A0ABC0] hover:text-[#e8bc69] transition-all duration-300 font-semibold"
              href="#"
            >
              About Us
            </a>
            <div className="w-px h-4 bg-[#2A3754]"></div>
            <a
              className="text-[#A0ABC0] hover:text-[#e8bc69] transition-all duration-300 font-semibold"
              href="#"
            >
              Contact
            </a>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[#1C2541] rounded-full border border-[#2A3754]">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-[#A0ABC0] font-mono font-bold tracking-widest">
              v2.1.0
            </span>
          </div>
        </div>
      </div>

      {/* Shimmer Bottom Line */}
      <div className="relative h-1 bg-[#1C2541] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#e8bc69] to-transparent animate-[shimmer_2s_infinite] opacity-50"></div>
      </div>
    </footer>
  );
}
