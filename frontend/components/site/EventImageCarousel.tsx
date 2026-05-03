"use client";

import { useEffect, useState } from "react";

const ROTATE_MS = 3000;

type Props = {
  images: string[];
  eventName: string;
  className?: string;
  /** Pausa la rotación (p. ej. hover en la card completa) */
  suspendAutoplay?: boolean;
};

export default function EventImageCarousel({
  images,
  eventName,
  className = "",
  suspendAutoplay = false,
}: Props) {
  const list = images.filter((u) => typeof u === "string" && u.trim().length > 0);
  const [current, setCurrent] = useState(0);

  const paused = suspendAutoplay;

  useEffect(() => {
    if (list.length <= 1) return;
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const interval = setInterval(() => {
      setCurrent((prev) => (prev === list.length - 1 ? 0 : prev + 1));
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [paused, list.length]);

  if (list.length === 0) {
    return (
      <div
        className={`carousel-container featured-carousel-fill bg-gradient-to-br from-[#1A1A2E] via-[#111118] to-[#7B5EA7]/20 ${className}`}
      />
    );
  }

  return (
    <div className={`carousel-container featured-carousel-fill pointer-events-none ${className}`}>
      <div className="carousel-image-wrapper">
        {list.map((img, i) => (
          <div
            key={`${img}-${i}`}
            className={`carousel-slide pointer-events-none ${i === current ? "active" : ""}`}
          >
            {/* img: URLs arbitrarias desde API / venues */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={`${eventName} — foto ${i + 1}`}
              className="absolute inset-0 h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>

      <div className="carousel-overlay pointer-events-none" aria-hidden />

      {list.length > 1 && (
        <>
          <button
            type="button"
            className="carousel-arrow left pointer-events-auto"
            aria-label="Foto anterior"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrent((c) => (c === 0 ? list.length - 1 : c - 1));
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel-arrow right pointer-events-auto"
            aria-label="Foto siguiente"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrent((c) => (c === list.length - 1 ? 0 : c + 1));
            }}
          >
            ›
          </button>
        </>
      )}

      {list.length > 1 && (
        <div className="carousel-dots pointer-events-auto">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`dot ${i === current ? "active" : ""}`}
              aria-label={`Ir a foto ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrent(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
