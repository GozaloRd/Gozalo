"use client";

import { useEffect, useState } from "react";
import { pendingScanCount } from "@/services/offline-tickets.service";

type Mode = "online" | "offline" | "syncing";

export function ConnectionBadge({ syncing }: { syncing: boolean }) {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState(0);

  useEffect(() => {
    const poll = () => {
      setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      void pendingScanCount().then(setQueue);
    };
    poll();
    const t = window.setInterval(poll, 4000);
    window.addEventListener("online", poll);
    window.addEventListener("offline", poll);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("online", poll);
      window.removeEventListener("offline", poll);
    };
  }, []);

  let mode: Mode = online ? "online" : "offline";
  if (syncing) mode = "syncing";

  const label =
    mode === "online"
      ? queue > 0
        ? `🟢 Online · ${queue} en cola`
        : "🟢 Online · sincronizado"
      : mode === "offline"
        ? "🟡 Offline · modo local"
        : "🔵 Sincronizando…";

  return (
    <p className="text-center text-[10px] font-medium text-slate-500" title={label}>
      {label}
    </p>
  );
}
