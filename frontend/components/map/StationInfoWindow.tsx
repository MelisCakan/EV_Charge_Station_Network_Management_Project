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
  station: MapStation;
  distanceKm?: number;
  onClose: () => void;
}

export function StationInfoWindow({ station, distanceKm, onClose }: StationInfoWindowProps) {
  const statusKey = station.status ?? "";

  return (
    <InfoWindow position={station.location} onCloseClick={onClose}>
      <div style={{ minWidth: 200, fontFamily: "sans-serif", padding: "4px 2px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          {station.name}
        </p>

        {station.status && (
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 10,
              ...(statusStyle[statusKey] ?? { background: "#f1f5f9", color: "#475569" }),
            }}
          >
            {statusLabel[statusKey] ?? statusKey}
          </span>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#334155" }}>
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
      </div>
    </InfoWindow>
  );
}
