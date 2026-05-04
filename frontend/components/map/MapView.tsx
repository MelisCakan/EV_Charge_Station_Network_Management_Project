"use client";

import { useEffect, useMemo, useState } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { DEFAULT_CENTER, haversineDistance, fetchDrivingDistance } from "@/lib/maps";
import { useAuth } from '@/lib/AuthContext';
import { MapCoordinates, MapStation, ChargingStation, Charger } from "@/lib/types";
import { stationApi, handleApiError } from "@/lib/api";
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

const MOCK_STATIONS: MapStation[] = [
  {
    id: '101',
    name: 'Seaside EV Hub',
    location: { lat: 38.4300, lng: 27.1450 },
    connector_types: ['CCS', 'Type2'],
    power_output: 120,
    pricing_per_kwh: 3.5,
    status: 'available',
  },
  {
    id: '102',
    name: 'Downtown Fast Charge',
    location: { lat: 38.4220, lng: 27.1410 },
    connector_types: ['CHAdeMO', 'CCS'],
    power_output: 50,
    pricing_per_kwh: 2.8,
    status: 'available',
  },
  {
    id: '103',
    name: 'Green Valley Station',
    location: { lat: 38.4190, lng: 27.1500 },
    connector_types: ['Type2'],
    power_output: 22,
    pricing_per_kwh: 2.2,
    status: 'occupied',
  },
];

function toMapStation(station: ChargingStation, chargers: Charger[]): MapStation {
  const connectorTypes = [...new Set(chargers.map(c => c.connector_type))] as Array<'CCS' | 'CHAdeMO' | 'Type2'>;
  const maxPower = chargers.length > 0 ? Math.max(...chargers.map(c => c.power_output)) : undefined;
  const minPrice = chargers.length > 0 ? Math.min(...chargers.map(c => c.pricing_per_kwh)) : undefined;

  const hasAvailable = chargers.some(c => c.status === 'available');
  const allOffline = chargers.every(c => c.status === 'offline');
  let status: 'available' | 'occupied' | 'offline' = 'occupied';
  if (hasAvailable) status = 'available';
  else if (allOffline || chargers.length === 0) status = 'offline';

  return {
    id: String(station.id),
    name: station.name,
    location: { lat: station.latitude, lng: station.longitude },
    connector_types: connectorTypes,
    power_output: maxPower,
    pricing_per_kwh: minPrice,
    status,
  };
}

export function MapView() {
  const { isAuthenticated } = useAuth();
  const [mapCenter, setMapCenter] = useState<MapCoordinates>(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState<MapCoordinates | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [selectedStation, setSelectedStation] = useState<MapStation | null>(null);
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>(['CCS', 'CHAdeMO', 'Type2']);
  const [selectedPowerId, setSelectedPowerId] = useState<PowerFilter>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50]);
  const [selectedStatuses, setSelectedStatuses] = useState<StationStatus[]>(['available', 'occupied', 'offline']);
  const [stations, setStations] = useState<MapStation[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Fetch stations from backend API
  useEffect(() => {
    async function fetchStations() {
      try {
        const stationList = await stationApi.list();
        const mapStations: MapStation[] = await Promise.all(
          stationList.map(async (station) => {
            try {
              const chargers = await stationApi.chargers(String(station.id));
              return toMapStation(station, chargers);
            } catch {
              return toMapStation(station, []);
            }
          })
        );
        if (mapStations.length === 0) {
          setStations(MOCK_STATIONS);
        } else {
          setStations(mapStations);
        }
      } catch (err) {
        console.error("Failed to fetch stations:", handleApiError(err).message);
        setStations(MOCK_STATIONS);
      }
    }
    fetchStations();
  }, []);

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

  // Haversine distance
  useEffect(() => {
    if (!userLocation || stations.length === 0) return;
    const computed: Record<string, number> = {};
    stations.forEach((station) => {
      computed[station.id] = haversineDistance(userLocation, station.location);
    });
    setDistances(computed);
  }, [userLocation, stations]);

  // Driving distance (Routes API)
  useEffect(() => {
    if (!userLocation || stations.length === 0) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        const computed: Record<string, number> = {};
        await Promise.allSettled(
          stations.map(async (station) => {
            try {
              computed[station.id] = await fetchDrivingDistance(userLocation, station.location);
            } catch {
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
  }, [userLocation, stations]);

  const filteredStations = useMemo(() => {
    const [minPower, maxPower] = powerRanges[selectedPowerId];

    return stations.filter((station) => {
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
  }, [stations, selectedConnectors, selectedPowerId, priceRange, selectedStatuses]);

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
    setPriceRange([0, 50]);
    setSelectedStatuses(['available', 'occupied', 'offline']);
    setSelectedStation(null);
  };

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
                showReserve={isAuthenticated}
                reserveUrl={`/reservations/new?station=${selectedStation.id}`}
              />
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
