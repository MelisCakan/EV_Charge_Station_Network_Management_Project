"use client";

import { useEffect, useMemo, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { DEFAULT_CENTER } from "@/lib/maps";
import { mockStations } from "@/lib/mockData";
import { MapCoordinates } from "@/lib/types";
import { StationMarker } from "./StationMarker";
import { FilterPanel } from "./FilterPanel";

type ConnectorType = 'CCS' | 'CHAdeMO' | 'Type2';

type PowerFilter = 'all' | 'low' | 'medium' | 'high';

const powerRanges: Record<PowerFilter, [number, number]> = {
  all: [0, 1000],
  low: [0, 50],
  medium: [50, 150],
  high: [150, 1000],
};

export function MapView() {
  const [mapCenter, setMapCenter] = useState<MapCoordinates>(DEFAULT_CENTER);
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>(['CCS', 'CHAdeMO', 'Type2']);
  const [selectedPowerId, setSelectedPowerId] = useState<PowerFilter>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10]);
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

  const filteredStations = useMemo(() => {
    const [minPower, maxPower] = powerRanges[selectedPowerId];

    return mockStations.filter((station) => {
      const connectorMatch =
        selectedConnectors.length === 0
          ? true
          : station.connector_types?.some((connector) => selectedConnectors.includes(connector)) ?? false;
      const powerMatch = station.power_output
        ? station.power_output >= minPower && station.power_output <= maxPower
        : selectedPowerId === 'all';
      const priceMatch = station.pricing_per_kwh
        ? station.pricing_per_kwh >= priceRange[0] && station.pricing_per_kwh <= priceRange[1]
        : true;

      return connectorMatch && powerMatch && priceMatch;
    });
  }, [selectedConnectors, selectedPowerId, priceRange]);

  const handleConnectorChange = (connector: ConnectorType, checked: boolean) => {
    setSelectedConnectors((current) => {
      if (checked) {
        return Array.from(new Set([...current, connector]));
      }
      return current.filter((item) => item !== connector);
    });
  };

  const handlePowerChange = (powerId: string) => {
    setSelectedPowerId(powerId as PowerFilter);
  };

  const handlePriceChange = (nextRange: [number, number]) => {
    setPriceRange(nextRange);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <FilterPanel
        selectedConnectors={selectedConnectors}
        selectedPowerId={selectedPowerId}
        priceRange={priceRange}
        onConnectorChange={handleConnectorChange}
        onPowerChange={handlePowerChange}
        onPriceChange={handlePriceChange}
      />

      <div className="w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-zinc-800">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultZoom={12}
            center={mapCenter}
            onCameraChanged={(ev) => setMapCenter(ev.detail.center)}
            mapId="DEMO_MAP_ID"
          >
            {filteredStations.map((station) => (
              <StationMarker key={station.id} station={station} />
            ))}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
