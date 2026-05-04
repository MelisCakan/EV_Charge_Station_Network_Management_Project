'use client';

import axios, { AxiosError, AxiosInstance } from 'axios';
import { Charger, ChargingStation, Vehicle } from './types';

export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends AuthPayload {
  full_name: string;
  phone_number?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
}

export interface ProfilePayload {
  email?: string;
  full_name?: string;
  phone_number?: string | null;
}

export interface ProfileResponse {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: string;
}

const MOCK_TOKEN = 'mock-token';
const MOCK_PASSWORD = 'demo123';
const MOCK_USER: ProfileResponse = {
  id: 1,
  email: 'demo@evcharge.test',
  full_name: 'Demo Driver',
  phone_number: '0500 000 0000',
  role: 'driver',
};

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 1,
    user_id: 1,
    brand: 'Tesla',
    model: 'Model 3',
    battery_capacity: 75,
    connector_type: 'CCS',
    plate_number: 'EV-1234',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 1,
    brand: 'Nissan',
    model: 'Leaf',
    battery_capacity: 40,
    connector_type: 'CHAdeMO',
    plate_number: 'EV-5678',
    created_at: new Date().toISOString(),
  },
];

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
};

const isNetworkOrNotFoundError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return !error.response || error.response.status === 404;
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as ApiError).status === 404;
  }
  return false;
};
const isMockToken = (token: string | null | undefined) => token === MOCK_TOKEN;

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(normalizeAxiosError(error))
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token');
      }
    }
    return Promise.reject(normalizeAxiosError(error));
  }
);

const normalizeAxiosError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    return {
      message:
        error.response?.data?.message || error.message || 'API request failed',
      status: error.response?.status,
      data: error.response?.data,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  // If it's already an ApiError object, return it
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return error as ApiError;
  }

  return {
    message: typeof error === 'string' ? error : 'Unexpected API error',
  };
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('token', token);
  }
};

export const clearAuthToken = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('token');
  }
};

export const getAuthToken = () => getStoredToken();

export const apiClient = api;

export const authApi = {
  login: async (payload: AuthPayload) => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', payload);
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        if (payload.email === MOCK_USER.email && payload.password === MOCK_PASSWORD) {
          return { access_token: MOCK_TOKEN, token_type: 'bearer' };
        }
        throw new Error('Invalid credentials');
      }
      throw error;
    }
  },
  register: async (payload: SignupPayload) => {
    try {
      const response = await api.post<RegisterResponse>('/auth/register', payload);
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        return { message: 'Mock user created', user_id: 1 };
      }
      throw error;
    }
  },
  me: async () => {
    const token = getStoredToken();
    if (isMockToken(token)) {
      return MOCK_USER;
    }

    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        return MOCK_USER;
      }
      throw error;
    }
  },
  updateProfile: async (payload: ProfilePayload) => {
    const token = getStoredToken();
    if (isMockToken(token)) {
      Object.assign(MOCK_USER, payload);
      return MOCK_USER;
    }

    try {
      const response = await api.put<ProfileResponse>('/auth/me', payload);
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        Object.assign(MOCK_USER, payload);
        return MOCK_USER;
      }
      throw error;
    }
  },
  deleteAccount: async () => {
    const token = getStoredToken();
    if (isMockToken(token)) {
      return;
    }

    try {
      const response = await api.delete<void>('/auth/me');
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        return;
      }
      throw error;
    }
  },
};

export type StationPayload = Omit<ChargingStation, 'id' | 'created_at'>;

export const vehicleApi = {
  list: async () => {
    try {
      const response = await api.get('/vehicles');
      return response.data;
    } catch (error) {
      if (isMockToken(getStoredToken()) || isNetworkOrNotFoundError(error)) {
        return MOCK_VEHICLES;
      }
      throw error;
    }
  },
  create: async (payload: any) => {
    const response = await api.post('/vehicles', payload);
    return response.data;
  },
  update: async (vehicleId: number, payload: any) => {
    const response = await api.put(`/vehicles/${vehicleId}`, payload);
    return response.data;
  },
  delete: async (vehicleId: number) => {
    const response = await api.delete(`/vehicles/${vehicleId}`);
    return response.data;
  },
};

const MOCK_STATIONS: ChargingStation[] = [
  {
    id: 101,
    name: 'Seaside EV Hub',
    latitude: 38.4300,
    longitude: 27.1450,
    address: 'Kordonboyu, İzmir',
    city: 'İzmir',
    operating_hours: '08:00-22:00',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 102,
    name: 'Downtown Fast Charge',
    latitude: 38.4220,
    longitude: 27.1410,
    address: 'Konak, İzmir',
    city: 'İzmir',
    operating_hours: '07:00-23:00',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 103,
    name: 'Green Valley Station',
    latitude: 38.4190,
    longitude: 27.1500,
    address: 'Bostanlı, İzmir',
    city: 'İzmir',
    operating_hours: '09:00-20:00',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

const MOCK_CHARGERS: Record<number, Charger[]> = {
  101: [
    { id: 1001, station_id: 101, charger_code: 'DC Fast #1', charger_type: 'DC', power_output: 120, connector_type: 'CCS', pricing_per_kwh: 3.5, status: 'available' },
    { id: 1002, station_id: 101, charger_code: 'AC Slow #2', charger_type: 'AC', power_output: 22, connector_type: 'Type2', pricing_per_kwh: 2.0, status: 'available' },
  ],
  102: [
    { id: 1003, station_id: 102, charger_code: 'CHAdeMO Speed', charger_type: 'DC', power_output: 50, connector_type: 'CHAdeMO', pricing_per_kwh: 2.8, status: 'available' },
    { id: 1004, station_id: 102, charger_code: 'CCS Rapid', charger_type: 'DC', power_output: 50, connector_type: 'CCS', pricing_per_kwh: 2.8, status: 'occupied' },
  ],
  103: [
    { id: 1005, station_id: 103, charger_code: 'Type2 Standard', charger_type: 'AC', power_output: 22, connector_type: 'Type2', pricing_per_kwh: 2.2, status: 'occupied' },
  ],
};

export const stationApi = {
  list: async () => {
    try {
      const response = await api.get<ChargingStation[]>('/stations');
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        return MOCK_STATIONS;
      }
      throw error;
    }
  },
  details: async (stationId: string) => {
    try {
      const response = await api.get<ChargingStation>(`/stations/${stationId}`);
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        const mock = MOCK_STATIONS.find((station) => String(station.id) === stationId);
        if (mock) return mock;
      }
      throw error;
    }
  },
  chargers: async (stationId: string) => {
    try {
      const response = await api.get<Charger[]>(`/stations/${stationId}/chargers`);
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        return MOCK_CHARGERS[Number(stationId)] ?? [];
      }
      throw error;
    }
  },
};

export const reservationApi = {
  list: async () => {
    try {
      const response = await api.get('/reservations');
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        if (typeof window !== 'undefined') {
          return JSON.parse(window.localStorage.getItem('mock_reservations') || '[]');
        }
        return [];
      }
      throw error;
    }
  },
  create: async (payload: any) => {
    try {
      const response = await api.post('/reservations', payload);
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        const start = new Date(payload.start_time);
        const end = new Date(start.getTime() + payload.duration_minutes * 60000);
        const newReservation = {
          id: Math.floor(Math.random() * 100000) + 1000,
          user_id: 1,
          vehicle_id: payload.vehicle_id,
          station_id: payload.station_id,
          charger_id: payload.charger_id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          status: 'confirmed',
          total_cost: payload.total_cost || null,
          created_at: new Date().toISOString(),
        };

        if (typeof window !== 'undefined') {
          const existing = JSON.parse(window.localStorage.getItem('mock_reservations') || '[]');
          existing.push(newReservation);
          window.localStorage.setItem('mock_reservations', JSON.stringify(existing));
        }
        return newReservation;
      }
      throw error;
    }
  },
  cancel: async (reservationId: number) => {
    try {
      const response = await api.delete(`/reservations/${reservationId}`);
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        if (typeof window !== 'undefined') {
          const existing = JSON.parse(window.localStorage.getItem('mock_reservations') || '[]');
          const resToCancel = existing.find((res: any) => res.id === reservationId);
          const updated = existing.filter((res: any) => res.id !== reservationId);
          window.localStorage.setItem('mock_reservations', JSON.stringify(updated));

          if (resToCancel && resToCancel.total_cost) {
            const now = new Date();
            const start = new Date(resToCancel.start_time);
            const timeUntilStart = (start.getTime() - now.getTime()) / 60000;
            
            let refundAmount = 0;
            if (timeUntilStart >= 30) {
              refundAmount = resToCancel.total_cost; // 100% refund
            } else if (timeUntilStart > 0) {
              refundAmount = resToCancel.total_cost * 0.8; // 80% refund (20% penalty)
            }

            if (refundAmount > 0) {
              const currentBalance = Number(window.localStorage.getItem('mock_wallet_balance') || MOCK_WALLET.balance);
              const newBalance = currentBalance + refundAmount;
              window.localStorage.setItem('mock_wallet_balance', String(newBalance));

              const txs = JSON.parse(window.localStorage.getItem('mock_wallet_transactions') || '[]');
              txs.unshift({
                id: Date.now(),
                amount: refundAmount,
                type: 'refund',
                timestamp: new Date().toISOString(),
                status: 'completed'
              });
              window.localStorage.setItem('mock_wallet_transactions', JSON.stringify(txs));
            }
          }
        }
        return { message: 'Reservation cancelled successfully' };
      }
      throw error;
    }
  },
};

const MOCK_WALLET = { balance: 150.0 };

export const walletApi = {
  get: async () => {
    try {
      const response = await api.get('/wallet');
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        if (typeof window !== 'undefined') {
          return { balance: Number(window.localStorage.getItem('mock_wallet_balance') || MOCK_WALLET.balance) };
        }
        return MOCK_WALLET;
      }
      throw error;
    }
  },
  getTransactions: async () => {
    try {
      const response = await api.get('/wallet/transactions');
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        if (typeof window !== 'undefined') {
          return JSON.parse(window.localStorage.getItem('mock_wallet_transactions') || '[]');
        }
        return [];
      }
      throw error;
    }
  },
  add: async (amount: number) => {
    try {
      const response = await api.post('/wallet/add', { amount });
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        if (typeof window !== 'undefined') {
          const current = Number(window.localStorage.getItem('mock_wallet_balance') || MOCK_WALLET.balance);
          const newBalance = current + amount;
          window.localStorage.setItem('mock_wallet_balance', String(newBalance));

          const txs = JSON.parse(window.localStorage.getItem('mock_wallet_transactions') || '[]');
          txs.unshift({
            id: Date.now(),
            amount: amount,
            type: 'topup',
            timestamp: new Date().toISOString(),
            status: 'completed'
          });
          window.localStorage.setItem('mock_wallet_transactions', JSON.stringify(txs));
          return { balance: newBalance };
        }
        MOCK_WALLET.balance += amount;
        return MOCK_WALLET;
      }
      throw error;
    }
  },
  deduct: async (amount: number) => {
    try {
      const response = await api.post('/wallet/deduct', { amount });
      return response.data;
    } catch (error) {
      if (isNetworkOrNotFoundError(error)) {
        if (typeof window !== 'undefined') {
          const current = Number(window.localStorage.getItem('mock_wallet_balance') || MOCK_WALLET.balance);
          if (current < amount) {
             throw new Error('Insufficient funds. Please add money to your wallet to continue.');
          }
          const newBalance = current - amount;
          window.localStorage.setItem('mock_wallet_balance', String(newBalance));

          const txs = JSON.parse(window.localStorage.getItem('mock_wallet_transactions') || '[]');
          txs.unshift({
            id: Date.now(),
            amount: amount,
            type: 'charge',
            timestamp: new Date().toISOString(),
            status: 'completed'
          });
          window.localStorage.setItem('mock_wallet_transactions', JSON.stringify(txs));
          return { balance: newBalance };
        }
        if (MOCK_WALLET.balance < amount) {
           throw new Error('Insufficient funds. Please add money to your wallet to continue.');
        }
        MOCK_WALLET.balance -= amount;
        return MOCK_WALLET;
      }
      throw error;
    }
  }
};

export const handleApiError = (error: unknown): ApiError => normalizeAxiosError(error);
