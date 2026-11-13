"use client";

import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/*
        ANIMATED BACKGROUND
        These blurry orbs float in the background to give a dynamic feel.
      */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-accent/20 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px] animate-pulse delay-1000" />

      {/*
        ANIMATED ICON AREA
        Spinning rings, a glowing core, a bouncing icon, and a floating 404 badge.
      */}
      <div className="relative mb-12 flex h-40 w-40 items-center justify-center">
        {/* Outer spinning dashed ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/30 animate-[spin_10s_linear_infinite]" />

        {/* Inner spinning ring (opposite direction) */}
        <div className="absolute inset-4 rounded-full border-2 border-accent/20 animate-[spin_15s_linear_infinite_reverse]" />

        {/* Glowing pulse behind the icon */}
        <div className="absolute inset-8 rounded-full bg-accent/10 shadow-[0_0_40px_rgba(232,188,105,0.3)] animate-pulse" />

        {/* The main bouncing icon */}
        <FileQuestion className="relative z-10 h-20 w-20 text-accent animate-bounce" />

        {/* The 404 Badge popping in */}
        <div className="absolute -bottom-4 -right-4 flex h-12 w-12 items-center justify-center rounded-full bg-panel border-2 border-border text-xl font-black text-primary shadow-xl animate-in zoom-in duration-500 delay-300">
          404
        </div>
      </div>

      {/*
        ANIMATED TEXT
        Slide up and fade in with staggered delays.
      */}
      <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        Page Not Found
      </h1>

      <p className="text-base text-secondary max-w-md mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        The page you are looking for doesn't exist, has been moved, or you don't have permission to
        view it.
      </p>

      {/*
        THE BUTTONS
        Exactly the same buttons, but added a smooth hover scale & active press effect.
      */}
      <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
        <Link
          href="/board"
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-bold text-accent-text transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(232,188,105,0.4)] hover:scale-105 active:scale-95 w-full sm:w-auto"
        >
          <Home
            size={18}
            className="transition-transform duration-300 group-hover:-translate-y-1"
          />
          Go to Board
        </Link>

        <button
          onClick={() => window.history.back()}
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panel px-8 py-3.5 text-sm font-bold text-primary transition-all duration-300 hover:border-accent/40 hover:bg-app hover:scale-105 active:scale-95 shadow-sm w-full sm:w-auto"
        >
          <ArrowLeft
            size={18}
            className="transition-transform duration-300 group-hover:-translate-x-1"
          />
          Go Back
        </button>
      </div>
    </div>
  );
}
