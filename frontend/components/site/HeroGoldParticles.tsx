"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";

const COUNT = 56;

type Particle = {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
};

function makeParticles(): Particle[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const a = i * 17.3;
    const b = i * 23.7;
    const left = 4 + ((a * 7) % 920) / 10;
    const top = 3 + ((b * 11) % 940) / 10;
    const size = 1.8 + (i % 5) * 0.55;
    const duration = 16 + (i % 11) * 1.2;
    const delay = (i * 0.37) % 14;
    return {
      left: `${Math.min(96, left)}%`,
      top: `${Math.min(94, top)}%`,
      size,
      duration,
      delay,
    };
  });
}

export function HeroGoldParticles() {
  const particles = useMemo(makeParticles, []);

  return (
    <div
      className="hero-gold-particles pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="hero-gold-particle absolute rounded-full"
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
