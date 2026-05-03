// ─── Map Types ───
export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapStation {
  id: string;
  name: string;
  location: MapCoordinates;
  connector_types?: Array<'CCS' | 'CHAdeMO' | 'Type2'>;
  power_output?: number;
  pricing_per_kwh?: number;
  status?: 'available' | 'occupied' | 'offline';
}

// ─── Backend Model Types ───
export interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: 'driver' | 'operator' | 'admin';
  assigned_region: string | null;
  created_at: string;
}

export interface Vehicle {
  id: number;
  user_id: number;
  brand: string;
  model: string;
  battery_capacity: number;
  connector_type: 'CCS' | 'CHAdeMO' | 'Type2';
  plate_number: string;
  created_at: string;
}

export interface ChargingStation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string | null;
  operating_hours: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Charger {
  id: number;
  station_id: number;
  charger_code: string;
  charger_type: 'AC' | 'DC';
  power_output: number;
  connector_type: 'CCS' | 'CHAdeMO' | 'Type2';
  pricing_per_kwh: number;
  status: 'available' | 'occupied' | 'offline';
}

export interface Reservation {
  id: number;
  user_id: number;
  vehicle_id: number;
  station_id: number;
  charger_id: number;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  total_cost: number | null;
  created_at: string;
}

export interface ReservationCreate {
  vehicle_id: number;
  station_id: number;
  charger_id: number;
  start_time: string;
  duration_minutes: number;
}

export interface ChargingSession {
  id: number;
  reservation_id: number;
  start_battery_level: number | null;
  end_battery_level: number | null;
  energy_consumed: number | null;
  total_cost: number | null;
  status: 'active' | 'completed';
  started_at: string;
  completed_at: string | null;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  wallet_id: number;
  session_id: number | null;
  amount: number;
  type: 'topup' | 'charge' | 'refund';
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: 'reservation_confirm' | 'charging_complete' | 'low_balance' | 'maintenance';
  sent_at: string;
  is_read: boolean;
}
