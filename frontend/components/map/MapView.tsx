"use client";

import { useEffect, useMemo, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { DEFAULT_CENTER, haversineDistance, fetchDrivingDistance } from "@/lib/maps";
import { mockStations } from "@/lib/mockData";
import { MapCoordinates, MapStation } from "@/lib/types";
import { StationMarker } from "./StationMarker";
import { FilterPanel, StationStatus } from "./FilterPanel";
import { StationInfoWindow } from "./StationInfoWindow";

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
  const [userLocation, setUserLocation] = useState<MapCoordinates | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [selectedStation, setSelectedStation] = useState<MapStation | null>(null);
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>(['CCS', 'CHAdeMO', 'Type2']);
  const [selectedPowerId, setSelectedPowerId] = useState<PowerFilter>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10]);
  const [selectedStatuses, setSelectedStatuses] = useState<StationStatus[]>(['available', 'occupied', 'offline']);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: MapCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(coords);
          setUserLocation(coords);
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  // Anlık Haversine — kullanıcı konumu alındığında hızlı bir başlangıç değeri verir
  useEffect(() => {
    if (!userLocation) return;
    const computed: Record<string, number> = {};
    mockStations.forEach((station) => {
      computed[station.id] = haversineDistance(userLocation, station.location);
    });
    setDistances(computed);
  }, [userLocation]);

  // Debounced Distance Matrix — gerçek GPS konumu alındıktan 800ms sonra sürüş mesafelerini çeker
  useEffect(() => {
    if (!userLocation) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        const computed: Record<string, number> = {};
        await Promise.allSettled(
          mockStations.map(async (station) => {
            try {
              computed[station.id] = await fetchDrivingDistance(userLocation, station.location);
            } catch {
              // API başarısız olursa Haversine ile fallback
              computed[station.id] = haversineDistance(userLocation, station.location);
            }
          }),
        );
        if (!cancelled) setDistances(computed);
      })();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userLocation]);

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
      const statusMatch =
        selectedStatuses.length === 0
          ? false
          : station.status
          ? selectedStatuses.includes(station.status as StationStatus)
          : true;

      return connectorMatch && powerMatch && priceMatch && statusMatch;
    });
  }, [selectedConnectors, selectedPowerId, priceRange, selectedStatuses]);

  const handleConnectorChange = (connector: ConnectorType, checked: boolean) => {
    setSelectedConnectors((current) => {
      if (checked) return Array.from(new Set([...current, connector]));
      return current.filter((item) => item !== connector);
    });
  };

  const handlePowerChange = (powerId: string) => {
    setSelectedPowerId(powerId as PowerFilter);
  };

  const handlePriceChange = (nextRange: [number, number]) => {
    setPriceRange(nextRange);
  };

  const handleStatusChange = (status: StationStatus, checked: boolean) => {
    setSelectedStatuses((current) => {
      if (checked) return Array.from(new Set([...current, status]));
      return current.filter((s) => s !== status);
    });
  };

  const handleReset = () => {
    setSelectedConnectors(['CCS', 'CHAdeMO', 'Type2']);
    setSelectedPowerId('all');
    setPriceRange([0, 10]);
    setSelectedStatuses(['available', 'occupied', 'offline']);
    setSelectedStation(null);
  };

  // InfoWindow'u kapat — seçili istasyon filtre dışına çıktıysa
  useEffect(() => {
    if (selectedStation && !filteredStations.some((s) => s.id === selectedStation.id)) {
      setSelectedStation(null);
    }
  }, [filteredStations, selectedStation]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <FilterPanel
        selectedConnectors={selectedConnectors}
        selectedPowerId={selectedPowerId}
        priceRange={priceRange}
        selectedStatuses={selectedStatuses}
        onConnectorChange={handleConnectorChange}
        onPowerChange={handlePowerChange}
        onPriceChange={handlePriceChange}
        onStatusChange={handleStatusChange}
        onReset={handleReset}
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
              <StationMarker
                key={station.id}
                station={station}
                onSelect={setSelectedStation}
              />
            ))}
            {selectedStation && (
              <StationInfoWindow
                station={selectedStation}
                distanceKm={distances[selectedStation.id]}
                onClose={() => setSelectedStation(null)}
              />
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
