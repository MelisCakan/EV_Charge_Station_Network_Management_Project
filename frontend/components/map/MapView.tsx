"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { DEFAULT_CENTER, MOCK_STATIONS } from "@/lib/maps";
import { MapCoordinates } from "@/lib/types";
import { StationMarker } from "./StationMarker";

export function MapView() {
  const [mapCenter, setMapCenter] = useState<MapCoordinates>(DEFAULT_CENTER);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-zinc-800">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultZoom={12}
          center={mapCenter}
          onCameraChanged={(ev) => setMapCenter(ev.detail.center)}
          mapId="DEMO_MAP_ID"
        >
          {MOCK_STATIONS.map((station) => (
            <StationMarker key={station.id} station={station} />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
