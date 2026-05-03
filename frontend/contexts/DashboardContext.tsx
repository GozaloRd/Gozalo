"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { fetchMineVenue, type VenuePickItem } from "@/lib/dashboardApi";
import { getToken } from "@/lib/api";

const STORAGE_KEY = "gozalo_dashboard_venue_id";

type Venue = {
  id: string;
  name: string;
  city?: string;
  capacity?: number;
  status?: string;
  description?: string;
  coverImageUrl?: string | null;
  slug?: string;
  address?: string | null;
  createdAt?: string;
  owner?: { id: string; fullName?: string; email?: string };
  payoutProfile?: {
    bankName?: string;
    accountHolder?: string;
    idTax?: string;
    accountType?: string;
    accountNumber?: string;
    bankSwiftOrRouting?: string;
    transferInstructions?: string;
  } | null;
};

type Ctx = {
  venue: Venue | null;
  venueId: string | null;
  needsVenue: boolean;
  /** Admin de plataforma: elegir local para ver el panel */
  needsVenuePick: boolean;
  venuesForPick: VenuePickItem[];
  isAdminViewer: boolean;
  loading: boolean;
  error: string | null;
  refresh: (opts?: { venueId?: string | null }) => Promise<void>;
  clearVenueSelection: () => void;
};

const DashboardContext = createContext<Ctx | null>(null);

function readVenueIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("venueId");
  return v && v.length > 0 ? v : null;
}

function getActiveVenueId(): string | null {
  const fromUrl = readVenueIdFromUrl();
  if (fromUrl) {
    localStorage.setItem(STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(STORAGE_KEY);
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [needsVenue, setNeedsVenue] = useState(false);
  const [needsVenuePick, setNeedsVenuePick] = useState(false);
  const [venuesForPick, setVenuesForPick] = useState<VenuePickItem[]>([]);
  const [isAdminViewer, setIsAdminViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { venueId?: string | null }) => {
    const token = getToken();
    if (!token) {
      router.replace("/login?next=/dashboard");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      let idForRequest: string | undefined;
      if (opts && "venueId" in opts) {
        if (opts.venueId) {
          localStorage.setItem(STORAGE_KEY, opts.venueId);
          idForRequest = opts.venueId;
          if (typeof window !== "undefined") {
            window.history.replaceState(
              {},
              "",
              `/dashboard?venueId=${encodeURIComponent(opts.venueId)}`
            );
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
          idForRequest = undefined;
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", "/dashboard");
          }
        }
      } else {
        idForRequest = getActiveVenueId() ?? undefined;
      }

      const data = await fetchMineVenue(idForRequest);
      setIsAdminViewer(data.viewerRole === "admin");
      setNeedsVenuePick(Boolean(data.needsVenuePick));
      setVenuesForPick(data.venues ?? []);
      setNeedsVenue(Boolean(data.needsVenue));
      setVenue(data.venue ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setVenue(null);
      setNeedsVenue(false);
      setNeedsVenuePick(false);
      setVenuesForPick([]);
      setIsAdminViewer(false);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const clearVenueSelection = useCallback(() => {
    void refresh({ venueId: null });
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <DashboardContext.Provider
      value={{
        venue,
        venueId: venue?.id ?? null,
        needsVenue,
        needsVenuePick,
        venuesForPick,
        isAdminViewer,
        loading,
        error,
        refresh,
        clearVenueSelection,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard dentro de DashboardProvider");
  return ctx;
}
