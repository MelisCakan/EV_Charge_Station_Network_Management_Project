export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapStation {
  id: string;
  name: string;
  location: MapCoordinates;
}
