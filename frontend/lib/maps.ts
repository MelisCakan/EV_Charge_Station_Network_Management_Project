import { MapCoordinates, MapStation } from "./types";

export const DEFAULT_CENTER: MapCoordinates = {
  lat: 38.4237,
  lng: 27.1428,
};

export const MOCK_STATIONS: MapStation[] = [
  {
    id: "station-1",
    name: "Karsiyaka Hub",
    location: { lat: 38.4549, lng: 27.1145 },
  },
  {
    id: "station-2",
    name: "Bornova Station",
    location: { lat: 38.4622, lng: 27.2185 },
  },
  {
    id: "station-3",
    name: "Buca Point",
    location: { lat: 38.3840, lng: 27.1685 },
  },
];
