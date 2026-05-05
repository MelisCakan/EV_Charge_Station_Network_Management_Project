"use client";

import { useEffect, useState } from "react";
import { useMapsLibrary, useMap } from "@vis.gl/react-google-maps";
import { MapCoordinates } from "@/lib/types";

interface RouteDisplayProps {
  /** Kullanıcının GPS konumu — MapView'dan geçirilir */
  origin: MapCoordinates;
  /** Rezervasyon yapılan istasyonun koordinatı */
  destination: MapCoordinates;
  /** Kullanıcı rotayı kapattığında çağrılır */
  onClose: () => void;
}

export function RouteDisplay({ origin, destination, onClose }: RouteDisplayProps) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

  useEffect(() => {
    if (!routesLib || !map) return;

    const service = new routesLib.DirectionsService();
    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#00E5FF",
        strokeOpacity: 0.8,
        strokeWeight: 6,
      },
    });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);

    return () => renderer.setMap(null);
  }, [routesLib, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer) return;

    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setRouteInfo({
              distanceKm: (leg.distance?.value ?? 0) / 1000,
              durationMinutes: Math.ceil((leg.duration?.value ?? 0) / 60),
            });
          }
        } else {
          console.error("Directions API hatası:", status);
        }
      }
    );
  }, [directionsService, directionsRenderer, origin, destination]);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#031712",
        border: "1px solid #18423b",
        borderRadius: 16,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {routeInfo && (
        <span style={{ color: "#D9D5D2", fontWeight: 500 }}>
          {routeInfo.distanceKm.toFixed(1)} km · {routeInfo.durationMinutes} dk
        </span>
      )}
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#6BC0A4",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          padding: 0,
        }}
      >
        ✕ Rotayı Kapat
      </button>
    </div>
  );
}
