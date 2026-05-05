"use client";

import { CSSProperties } from "react";
import { InfoWindow } from "@vis.gl/react-google-maps";
import { MapStation, Charger, MapCoordinates } from "@/lib/types";

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
  chargers?: Charger[];
  distanceKm?: number;
  onClose: () => void;
  /** isAuthenticated'dan geliyor — butonu enable/disable eder */
  showReserve?: boolean;
  /** Rezervasyon onaylandığında station.location ile çağrılır */
  onReserve?: (destination: MapCoordinates) => void;
}

export function StationInfoWindow({ station, chargers = [], distanceKm, onClose, showReserve = false, onReserve }: StationInfoWindowProps) {
  const statusKey = station.status ?? "";

  return (
    <InfoWindow position={station.location} onCloseClick={onClose}>
      <div style={{ minWidth: 220, fontFamily: "sans-serif", padding: "4px 2px" }}>
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
              {station.pricing_per_kwh.toFixed(2)} TL/kWh
            </div>
          )}
        </div>

        {/* Charger Status List */}
        {chargers.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Chargers</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {chargers.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <span style={{ color: "#334155" }}>{c.charger_code} ({c.connector_type})</span>
                  <span
                    style={{
                      padding: "1px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      ...(statusStyle[c.status] ?? { background: "#f1f5f9", color: "#475569" }),
                    }}
                  >
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
            {distanceKm.toFixed(1)} km away
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
          <button
            onClick={() => onReserve?.(station.location)}
            disabled={!showReserve}
            title={!showReserve ? "Giriş yapın ve konum iznine izin verin" : undefined}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: 8,
              background: showReserve ? "#2563EB" : "#94a3b8",
              color: "#F2F2F0",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: showReserve ? "pointer" : "not-allowed",
              opacity: showReserve ? 1 : 0.6,
            }}
          >
            Rezervasyon Yap
          </button>
        </div>
      </div>
    </InfoWindow>
  );
}
