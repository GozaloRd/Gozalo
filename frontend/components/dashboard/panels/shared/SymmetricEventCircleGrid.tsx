"use client";

import { useMemo, type ReactNode } from "react";

/**
 * Layout simétrico compartido entre Tickets y Mesas (selector de eventos).
 */
export function SymmetricEventCircleGrid({ cells }: { cells: ReactNode[] }) {
  const n = cells.length;

  const layout = useMemo(() => {
    if (n === 5) {
      return (
        <div className="flex flex-col items-center gap-6 pt-1">
          <div className="grid w-full max-w-[240px] grid-cols-2 justify-items-center gap-4">{cells.slice(0, 2)}</div>
          <div className="grid w-full max-w-[340px] grid-cols-3 justify-items-center gap-3">{cells.slice(2, 5)}</div>
        </div>
      );
    }
    if (n <= 1) return <div className="flex justify-center pt-1">{cells}</div>;
    if (n === 2) {
      return (
        <div className="mx-auto grid max-w-[260px] grid-cols-2 justify-items-center gap-6 pt-1">{cells}</div>
      );
    }
    if (n === 3) {
      return (
        <div className="mx-auto grid max-w-[360px] grid-cols-3 justify-items-center gap-3 pt-1">{cells}</div>
      );
    }
    if (n === 4) {
      return (
        <div className="mx-auto grid max-w-[260px] grid-cols-2 justify-items-center gap-6 pt-1">{cells}</div>
      );
    }
    if (n === 6) {
      return (
        <div className="mx-auto grid max-w-[360px] grid-cols-3 justify-items-center gap-5 pt-1">{cells}</div>
      );
    }
    return (
      <div className="mx-auto grid max-h-[min(55vh,480px)] max-w-[340px] grid-cols-3 justify-items-center gap-x-3 gap-y-5 overflow-y-auto overscroll-contain px-1 py-1 pt-1">
        {cells}
      </div>
    );
  }, [cells, n]);

  return layout;
}
