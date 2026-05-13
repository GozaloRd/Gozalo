"use client";

/** Capa decorativa sobre `StarryBackground` (solo desktop). */
export function ShootingStarsLayer() {
  const specs = [
    { top: "12%", left: "72%", delay: "0s", dur: "5.2s" },
    { top: "22%", left: "85%", delay: "1.4s", dur: "6.1s" },
    { top: "8%", left: "58%", delay: "2.8s", dur: "5.8s" },
    { top: "18%", left: "68%", delay: "4.1s", dur: "6.4s" },
  ] as const;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {specs.map((s, i) => (
        <span
          key={i}
          className="shooting-star-anim absolute h-[1px] w-28 origin-left bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-0"
          style={{
            top: s.top,
            left: s.left,
            animationDuration: s.dur,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
