"use client";

import { CSSProperties } from "react";
import { InfoWindow } from "@vis.gl/react-google-maps";
import { MapStation } from "@/lib/types";

const statusLabel: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  offline: "Offline",
};

const statusStyle: Record<string, CSSProperties> = {
  available: { background: "#dcfce7", color: "#15803d" },
  occupied:  { background: "#fef9c3", color: "#a16207" },
  offline:   { background: "#fee2e2", color: "#b91c1c" },
};

interface StationInfoWindowProps {
  station: MapStation & { chargerDetails?: { id: number, code: string, type: string, status: string, closestTime?: string | null }[] };
  distanceKm?: number;
  onClose: () => void;
  showReserve?: boolean;
  reserveUrl?: string;
}

export function StationInfoWindow({ station, distanceKm, onClose, showReserve = false, reserveUrl }: StationInfoWindowProps) {
  return (
    <InfoWindow position={station.location} onCloseClick={onClose}>
      <div style={{ minWidth: 200, fontFamily: "sans-serif", padding: "4px 2px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          {station.name}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155", marginTop: 8 }}>
          {station.connector_types && station.connector_types.length > 0 && (
            <div>
              <span style={{ fontWeight: 600 }}>Connectors: </span>
              {station.connector_types.join(", ")}
            </div>
          )}
          {station.power_output != null && (
            <div>
              <span style={{ fontWeight: 600 }}>Power: </span>
              {station.power_output} kW
            </div>
          )}
          {station.pricing_per_kwh != null && (
            <div>
              <span style={{ fontWeight: 600 }}>Price: </span>
              ₺{station.pricing_per_kwh.toFixed(2)} / kWh
            </div>
          )}
        </div>

        {distanceKm != null && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 15 }}>📍</span>
            {distanceKm.toFixed(1)} km uzakta
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <a
            href={`/stations/${station.id}`}
            style={{
              flex: 1,
              display: "block",
              padding: "6px 12px",
              borderRadius: 8,
              background: "#0B3E34",
              color: "#F2F2F0",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            View Details
          </a>
          {showReserve && reserveUrl && (
            <a
              href={reserveUrl}
              style={{
                flex: 1,
                display: "block",
                padding: "6px 12px",
                borderRadius: 8,
                background: "#2563EB",
                color: "#F2F2F0",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Reserve Here
            </a>
          )}
        </div>
      </div>
    </InfoWindow>
  );
}
