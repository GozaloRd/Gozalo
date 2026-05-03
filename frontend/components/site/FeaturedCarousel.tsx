"use client";



import Link from "next/link";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";



const INTERVAL_MS = 4000;

const EXIT_MS = 500;

const ACCENT = "#9B7FCA";



export type FeaturedCarouselItem = {

  id: string;

  title: string;

  slug: string;

  coverImageUrl: string;

  featured?: boolean;

  category?: string;

  city?: string;

  startAt?: string;

  minPrice?: number | null;

  /** 0–100 para badge “vendido” */

  soldPercent?: number;

};



export const FEATURED_CAROUSEL_DEMO: FeaturedCarouselItem[] = [

  {

    id: "1",

    title: "Noche de Reggaetón RD",

    slug: "noche-de-reggaeton-rd",

    coverImageUrl: "https://images.unsplash.com/photo-1571266028243-d220c6a7f2d4?w=1200",

    featured: true,

    category: "Música",

    city: "Santo Domingo",

    startAt: "2026-05-01T21:00:00.000Z",

    minPrice: 500,

    soldPercent: 87,

  },

  {

    id: "2",

    title: "Salsa & Ron Night",

    slug: "salsa-ron-night",

    coverImageUrl: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=1200",

    featured: true,

    category: "Música",

    city: "Santiago",

    startAt: "2026-04-29T22:00:00.000Z",

    minPrice: 300,

    soldPercent: 72,

  },

  {

    id: "3",

    title: "Electric Vibes Punta Cana",

    slug: "electric-vibes-punta-cana",

    coverImageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200",

    featured: true,

    category: "Electrónica",

    city: "Punta Cana",

    startAt: "2026-04-27T23:00:00.000Z",

    minPrice: 700,

    soldPercent: 91,

  },

];



type Props = {

  items: FeaturedCarouselItem[];

};



export default function FeaturedCarousel({ items }: Props) {

  const slides = useMemo(

    () => (items.length > 0 ? items : FEATURED_CAROUSEL_DEMO),

    [items]

  );

  const n = slides.length;

  const [index, setIndex] = useState(0);

  const [hover, setHover] = useState(false);

  const [cardHover, setCardHover] = useState(false);

  const [exiting, setExiting] = useState(false);

  const [reduceMotion, setReduceMotion] = useState(false);

  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {

    if (typeof window === "undefined") return;

    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  }, []);



  const advance = useCallback(() => {

    if (n <= 1 || reduceMotion) {

      setIndex((i) => (i + 1) % n);

      return;

    }

    setExiting(true);

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    exitTimerRef.current = setTimeout(() => {

      setIndex((i) => (i + 1) % n);

      setExiting(false);

      exitTimerRef.current = null;

    }, EXIT_MS);

  }, [n, reduceMotion]);



  useEffect(() => {

    return () => {

      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    };

  }, []);



  useEffect(() => {

    if (n <= 1 || hover || exiting) return;

    const id = window.setInterval(advance, INTERVAL_MS);

    return () => clearInterval(id);

  }, [n, hover, exiting, advance]);



  const goTo = useCallback(

    (i: number) => {

      if (i === index || i < 0 || i >= n) return;

      if (reduceMotion) {

        setIndex(i);

        return;

      }

      setExiting(true);

      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

      exitTimerRef.current = setTimeout(() => {

        setIndex(i);

        setExiting(false);

        exitTimerRef.current = null;

      }, EXIT_MS);

    },

    [index, n, reduceMotion]

  );



  const layerCount = n >= 3 ? 3 : Math.max(1, n);



  return (

    <div className="w-full">

      <div className="featured-section-label mb-6 flex w-full max-w-[900px] items-center gap-4 sm:mb-8">

        <span className="shrink-0 text-[11px] font-bold tracking-[0.28em] text-neutral-500">

          DESTACADOS

        </span>

        <div className="h-px min-h-px flex-1 rounded-full bg-gozalo-accent/40" aria-hidden />

      </div>



      <div className="relative mx-auto w-full max-w-[900px]">

        <div

          className="relative flex w-full flex-col items-center gap-4 md:flex-row md:items-center md:gap-5 lg:gap-8"

          onMouseEnter={() => setHover(true)}

          onMouseLeave={() => setHover(false)}

        >

          <div

            className="stack-3d-container group/stack relative h-[min(420px,72vw)] min-h-[280px] w-full min-w-0 max-w-[800px] flex-1 [perspective:1000px] sm:h-[440px] md:h-[480px]"

            onMouseEnter={() => setCardHover(true)}

            onMouseLeave={() => setCardHover(false)}

          >

            {Array.from({ length: layerCount }).map((_, slot) => {

              const evIdx = (index + slot) % n;

              const ev = slides[evIdx];

              const isFront = slot === 0;

              const isExit = exiting && isFront && !reduceMotion;

              const showKen = isFront && !isExit && !reduceMotion;



              let layerClass = "stack-card-layer ";

              if (isExit) layerClass += "stack-card-layer--exit";

              else if (slot === 0) layerClass += "stack-card-layer--active";

              else if (slot === 1) layerClass += "stack-card-layer--second";

              else layerClass += "stack-card-layer--third";



              const evHref = `/eventos/${ev.slug}`;

              const evSold =

                ev.soldPercent ?? (Number(ev.id.replace(/\D/g, "")) % 35) + 60;



              return (

                <div

                  key={`${ev.id}-${slot}-${index}`}

                  className={layerClass}

                  aria-hidden={!isFront}

                >

                  {/* eslint-disable-next-line @next/next/no-img-element */}

                  <img

                    src={ev.coverImageUrl}

                    alt=""

                    className={`h-full w-full object-cover ${showKen ? "featured-carousel-ken" : ""}`}

                    draggable={false}

                  />



                  {isFront && (

                    <>

                      <div

                        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${

                          cardHover ? "opacity-100" : "opacity-0"

                        } [@media(hover:none)]:opacity-0`}

                        style={{ background: "rgba(0,0,0,0.12)" }}

                        aria-hidden

                      />



                      <div

                        className="pointer-events-none absolute right-4 top-4 z-20 border border-[rgba(255,107,43,0.4)] px-[14px] py-1.5 text-[13px] font-medium text-white"

                        style={{

                          borderRadius: 20,

                          background: "rgba(0,0,0,0.5)",

                          backdropFilter: "blur(8px)",

                          WebkitBackdropFilter: "blur(8px)",

                        }}

                      >

                        🔥 {evSold}% vendido

                      </div>



                      <div

                        className={`pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 transition-opacity duration-300 ${

                          cardHover ? "opacity-100" : "opacity-0"

                        } [@media(hover:none)]:opacity-100`}

                      >

                        <Link

                          href={evHref}

                          className="pointer-events-auto inline-flex rounded-full px-8 py-3 text-base font-semibold text-white transition hover:brightness-110"

                          style={{ backgroundColor: ACCENT }}

                        >

                          Ver evento →

                        </Link>

                      </div>

                    </>

                  )}

                </div>

              );

            })}

          </div>

        </div>



        {n > 1 && (

          <div className="flex justify-center gap-1.5 py-2" role="group" aria-label="Indicadores de slide">

            {slides.map((s, i) => (

              <button

                key={s.id}

                type="button"

                aria-current={i === index ? "true" : undefined}

                aria-label={`Ir al slide ${i + 1}`}

                className={`h-1.5 cursor-pointer border-0 p-0 transition-all duration-200 ease-out ${

                  i === index

                    ? "w-[18px] rounded-[3px] bg-gozalo-accent"

                    : "w-1.5 rounded-full bg-neutral-300 hover:bg-neutral-400"

                }`}

                onClick={() => goTo(i)}

              />

            ))}

          </div>

        )}

      </div>

    </div>

  );

}

