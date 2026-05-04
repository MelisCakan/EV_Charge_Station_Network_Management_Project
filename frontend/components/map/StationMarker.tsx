"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapStation } from "@/lib/types";

const statusColor: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-yellow-500",
  offline: "bg-red-500",
};

interface StationMarkerProps {
  station: MapStation & { chargerDetails?: any[] };
  onSelect: (station: MapStation & { chargerDetails?: any[] }) => void;
}

export function StationMarker({ station, onSelect }: StationMarkerProps) {
  const colorClass = statusColor[station.status ?? ""] ?? "bg-zinc-400";

  return (
    <AdvancedMarker
      position={station.location}
      title={station.name}
      onClick={() => onSelect(station)}
    >
      <div className={`w-4 h-4 ${colorClass} rounded-full border-2 border-white shadow-md cursor-pointer`} />
    </AdvancedMarker>
  );
}
