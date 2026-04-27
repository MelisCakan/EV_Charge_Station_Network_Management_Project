"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapStation } from "@/lib/types";

interface StationMarkerProps {
  station: MapStation;
}

export function StationMarker({ station }: StationMarkerProps) {
  return (
    <AdvancedMarker position={station.location} title={station.name}>
      <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md" />
    </AdvancedMarker>
  );
}
