"use client";

import { useEffect, useState } from "react";

const COLORS = ["#e8bc69", "#f1cf8b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22d3ee"];
const EMOJIS = ["🎉", "🎊", "✨", "🌟", "⭐", "💫", "🏆", "🥳"];

type Particle = {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
  emoji: string | null;
  shape: "circle" | "square" | "strip";
};

export function TourConfetti() {
  const [active, setActive] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const handleConfetti = () => {
      const newParticles: Particle[] = Array.from({ length: 220 }).map((_, i) => {
        const isEmoji = Math.random() > 0.65;
        const roll = Math.random();
        return {
          id: i,
          x: Math.random() * 100,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 2.5,        // staggered — continuous wave
          duration: 2.5 + Math.random() * 3.5, // 2.5s – 6s fall time
          size: isEmoji ? 22 + Math.random() * 18 : 10 + Math.random() * 16,
          rotate: Math.random() * 360,
          emoji: isEmoji ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
          shape: roll > 0.7 ? "circle" : roll > 0.4 ? "square" : "strip",
        };
      });
      setParticles(newParticles);
      setActive(true);
      // 10s = max(delay 2.5s + duration 6s) + buffer
      setTimeout(() => setActive(false), 10000);
    };

    window.addEventListener("tour-confetti", handleConfetti);
    return () => window.removeEventListener("tour-confetti", handleConfetti);
  }, []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-10vh) rotate(0deg);   opacity: 1; }
          85%  {                                              opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(20px); }
        }
        .confetti-wiggle {
          position: absolute;
          top: -40px;
          animation: wiggle 0.75s ease-in-out infinite alternate;
        }
        .confetti-fall {
          animation: fall linear forwards;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-wiggle"
          style={{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
          }}
        >
          <div
            className="confetti-fall"
            style={{
              backgroundColor: p.emoji ? "transparent" : p.color,
              width: `${p.size}px`,
              height: p.shape === "strip" ? `${p.size * 2.2}px` : `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              borderRadius: p.shape === "circle" ? "50%" : "2px",
              fontSize: p.emoji ? `${p.size}px` : undefined,
              lineHeight: 1,
              boxShadow: p.emoji ? "none" : `0 0 6px ${p.color}80`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          >
            {p.emoji}
          </div>
        </div>
      ))}
    </div>
  );
}
