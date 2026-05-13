"use client";

import { useCallback, useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function normalizeLeafletIcon() {
  if (typeof window === "undefined") return;
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

function DragMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const m = e.target;
          const ll = m.getLatLng();
          onPositionChange(ll.lat, ll.lng);
        },
      }}
    />
  );
}

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
};

const DEFAULT: [number, number] = [18.4861, -69.9312];

export function LocationMapPicker({ lat, lng, onChange, className = "" }: Props) {
  const center: [number, number] = useMemo(() => {
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      return [lat, lng];
    }
    return DEFAULT;
  }, [lat, lng]);

  const position: [number, number] = useMemo(() => {
    if (lat != null && lng != null) return [lat, lng];
    return center;
  }, [lat, lng, center]);

  useEffect(() => {
    normalizeLeafletIcon();
  }, []);

  const onPositionChange = useCallback(
    (la: number, lg: number) => {
      onChange(la, lg);
    },
    [onChange]
  );

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/50 ${className}`}
    >
      <MapContainer
        center={center}
        zoom={14}
        className="h-[220px] w-full"
        scrollWheelZoom={false}
        aria-label="Mapa de ubicación"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DragMarker position={position} onPositionChange={onPositionChange} />
      </MapContainer>
      <p className="border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-500">
        Toca el mapa o arrastra el pin. Coordenadas:{" "}
        <span className="tabular-nums text-zinc-300">
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </span>
      </p>
    </div>
  );
}
