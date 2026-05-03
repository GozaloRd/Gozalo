"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";

type Star = {
  id: number;
  topPct: number;
  leftPct: number;
  width: number;
  duration: number;
};

let idSeq = 0;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function ShootingStarsHero() {
  const [stars, setStars] = useState<Star[]>([]);

  const removeStar = useCallback((id: number) => {
    setStars((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const trySpawn = useCallback(() => {
    setStars((prev) => {
      if (prev.length >= 3) return prev;
      const id = ++idSeq;
      const star: Star = {
        id,
        topPct: randomBetween(3, 42),
        leftPct: randomBetween(48, 98),
        width: randomBetween(80, 150),
        duration: randomBetween(2, 5),
      };
      return [...prev, star];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tid: ReturnType<typeof setTimeout>;

    const loop = () => {
      if (cancelled) return;
      trySpawn();
      tid = setTimeout(loop, randomBetween(900, 5200));
    };

    loop();
    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [trySpawn]);

  return (
    <div className="shooting-star" aria-hidden>
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={
            {
              top: `${s.topPct}%`,
              left: `${s.leftPct}%`,
              width: `${s.width}px`,
              animation: `shooting ${s.duration}s linear forwards`,
            } as CSSProperties
          }
          onAnimationEnd={() => removeStar(s.id)}
        />
      ))}
    </div>
  );
}
