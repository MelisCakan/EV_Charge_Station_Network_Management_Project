import { MapCoordinates } from "./types";

export const DEFAULT_CENTER: MapCoordinates = {
  lat: 38.4237,
  lng: 27.1428,
};

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(a: MapCoordinates, b: MapCoordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

interface RoutesApiResponse {
  routes?: Array<{ distanceMeters?: number }>;
}

export async function fetchDrivingDistance(
  origin: MapCoordinates,
  destination: MapCoordinates,
): Promise<number> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Routes API error: ${response.status}`);
  }

  const data: RoutesApiResponse = await response.json();
  const distanceMeters = data.routes?.[0]?.distanceMeters;
  if (distanceMeters == null) throw new Error("Routes API: distance not found in response");

  return distanceMeters / 1000;
}
