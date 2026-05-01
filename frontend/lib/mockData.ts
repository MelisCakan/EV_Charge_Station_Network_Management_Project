import { MapStation, Vehicle } from './types';

export const sampleVehicles: Vehicle[] = [
  {
    id: 1,
    user_id: 1,
    brand: 'Tesla',
    model: 'Model 3',
    battery_capacity: 82,
    connector_type: 'Type2',
    plate_number: '34EV1234',
    created_at: '2026-04-25T10:30:00Z',
  },
  {
    id: 2,
    user_id: 1,
    brand: 'Nissan',
    model: 'Leaf',
    battery_capacity: 40,
    connector_type: 'CHAdeMO',
    plate_number: '34EL5678',
    created_at: '2026-04-28T14:12:00Z',
  },
  {
    id: 3,
    user_id: 1,
    brand: 'Audi',
    model: 'Q4 e-tron',
    battery_capacity: 77,
    connector_type: 'CCS',
    plate_number: '34EV9999',
    created_at: '2026-04-29T09:05:00Z',
  },
];

export const mockStations: MapStation[] = [
  {
    id: 'station-1',
    name: 'Karsiyaka Hub',
    location: { lat: 38.4549, lng: 27.1145 },
    connector_types: ['CCS', 'Type2'],
    power_output: 150,
    pricing_per_kwh: 1.15,
    status: 'available',
  },
  {
    id: 'station-2',
    name: 'Bornova Station',
    location: { lat: 38.4622, lng: 27.2185 },
    connector_types: ['CHAdeMO', 'Type2'],
    power_output: 45,
    pricing_per_kwh: 0.95,
    status: 'occupied',
  },
  {
    id: 'station-3',
    name: 'Buca Point',
    location: { lat: 38.3840, lng: 27.1685 },
    connector_types: ['CCS'],
    power_output: 220,
    pricing_per_kwh: 1.6,
    status: 'offline',
  },
];

export type StationChargerDevice = {
  id: number;
  charger_code: string;
  charger_type: 'AC' | 'DC';
  connector_type: 'CCS' | 'CHAdeMO' | 'Type2';
  power_output: number;
  pricing_per_kwh: number;
  status: 'available' | 'occupied' | 'offline';
};

export const stationChargerDevices: StationChargerDevice[] = [
  {
    id: 1,
    charger_code: 'CW-01',
    charger_type: 'DC',
    connector_type: 'CCS',
    power_output: 180,
    pricing_per_kwh: 1.45,
    status: 'available',
  },
  {
    id: 2,
    charger_code: 'CW-02',
    charger_type: 'DC',
    connector_type: 'CCS',
    power_output: 150,
    pricing_per_kwh: 1.39,
    status: 'occupied',
  },
  {
    id: 3,
    charger_code: 'AC-1',
    charger_type: 'AC',
    connector_type: 'Type2',
    power_output: 22,
    pricing_per_kwh: 0.95,
    status: 'offline',
  },
];
