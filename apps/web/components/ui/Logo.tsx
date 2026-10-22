"use client";

import Link from "next/link";

export function Logo({ size = "md", href = "/" }: { size?: "sm" | "md" | "lg"; href?: string }) {
  const heights = { sm: "h-8", md: "h-10", lg: "h-14" };
  const textSizes = { sm: "text-base", md: "text-lg", lg: "text-2xl" };
  const subSizes = { sm: "text-[9px]", md: "text-[10px]", lg: "text-[12px]" };

  const content = (
    <div className="flex items-center gap-3 transition hover:opacity-80">
      {/* YOUR LOGO IMAGE */}
      <img
        src="/logo.png"
        alt="HAWLHAYE Logo"
        className={`${heights[size]} w-auto object-contain`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "flex";
        }}
      />

      {/* FALLBACK "H" (If logo.png is missing) */}
      <div
        style={{ display: "none" }}
        className={`${heights[size]} aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-[#142b4a] to-[#0A1628] border border-[#e8bc69]/20 font-black text-[#e8bc69] shadow-lg shadow-black/50`}
      >
        H
      </div>

      {/* TEXT */}
      <div>
        <p className={`font-extrabold tracking-[0.16em] text-white ${textSizes[size]}`}>HAWLHAYE</p>
        <p className={`font-semibold uppercase tracking-[0.2em] text-[#8888aa] ${subSizes[size]}`}>
          Work. Organised.
        </p>
      </div>
    </div>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
