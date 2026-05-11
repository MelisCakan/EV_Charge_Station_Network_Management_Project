'use client';

import axios, { AxiosError, AxiosInstance } from 'axios';
import { Charger, ChargingStation, ChargingSession, Vehicle, Wallet, Transaction } from './types';

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

const MOCK_TOKEN = 'mock-token-demo';
const MOCK_USER: ProfileResponse = {
  id: 1,
  email: 'demo@evcharge.test',
  full_name: 'Demo Driver',
  phone_number: '0555 123 4567',
  role: 'driver',
};
const isMockToken = (token: string | null | undefined) => token === MOCK_TOKEN;

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
};

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
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
    if (payload.email === 'demo@evcharge.test' && payload.password === 'demo123') {
      return { access_token: MOCK_TOKEN, token_type: 'bearer' };
    }
    const response = await api.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },
  register: async (payload: SignupPayload) => {
    if (payload.email === 'demo@evcharge.test') {
      return { message: 'Mock user registered', user_id: 1 };
    }
    const response = await api.post<RegisterResponse>('/auth/register', payload);
    return response.data;
  },
  me: async () => {
    if (isMockToken(getStoredToken())) return MOCK_USER;
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateProfile: async (payload: ProfilePayload) => {
    if (isMockToken(getStoredToken())) {
      return { ...MOCK_USER, ...payload, phone_number: payload.phone_number ?? MOCK_USER.phone_number } as ProfileResponse;
    }
    const response = await api.put<ProfileResponse>('/auth/me', payload);
    return response.data;
  },
  deleteAccount: async () => {
    if (isMockToken(getStoredToken())) return;
    const response = await api.delete<void>('/auth/me');
    return response.data;
  },
};

export type StationPayload = Omit<ChargingStation, 'id' | 'created_at'>;

let mockVehicles: any[] = [
  {
    id: 1,
    user_id: 1,
    brand: 'Tesla',
    model: 'Model 3',
    battery_capacity: 75,
    connector_type: 'CCS',
    plate_number: '34EV123',
    created_at: new Date().toISOString(),
  }
];

export const vehicleApi = {
  list: async () => {
    if (isMockToken(getStoredToken())) {
      return [...mockVehicles];
    }
    const response = await api.get('/vehicles');
    return response.data;
  },
  create: async (payload: any) => {
    if (isMockToken(getStoredToken())) {
      const newVehicle = { id: Date.now(), ...payload, user_id: 1, created_at: new Date().toISOString() };
      mockVehicles.push(newVehicle);
      return newVehicle;
    }
    const response = await api.post('/vehicles', payload);
    return response.data;
  },
  update: async (vehicleId: number, payload: any) => {
    if (isMockToken(getStoredToken())) {
      const index = mockVehicles.findIndex(v => v.id === vehicleId);
      if (index !== -1) {
        mockVehicles[index] = { ...mockVehicles[index], ...payload };
        return mockVehicles[index];
      }
      return { id: vehicleId, ...payload };
    }
    const response = await api.put(`/vehicles/${vehicleId}`, payload);
    return response.data;
  },
  delete: async (vehicleId: number) => {
    if (isMockToken(getStoredToken())) {
      mockVehicles = mockVehicles.filter(v => v.id !== vehicleId);
      return { message: 'Deleted' };
    }
    const response = await api.delete(`/vehicles/${vehicleId}`);
    return response.data;
  },
};

export const stationApi = {
  list: async () => {
    const response = await api.get<ChargingStation[]>('/stations');
    return response.data;
  },
  details: async (stationId: string) => {
    const response = await api.get<ChargingStation>(`/stations/${stationId}`);
    return response.data;
  },
  chargers: async (stationId: string) => {
    const response = await api.get<Charger[]>(`/stations/${stationId}/chargers`);
    return response.data;
  },
};

export const reservationApi = {
  list: async () => {
    if (isMockToken(getStoredToken())) return [];
    const response = await api.get('/reservations');
    return response.data;
  },
  create: async (payload: any) => {
    if (isMockToken(getStoredToken())) return { id: Date.now(), ...payload, status: 'confirmed' };
    const response = await api.post('/reservations', payload);
    return response.data;
  },
  cancel: async (reservationId: number) => {
    if (isMockToken(getStoredToken())) return { message: 'Cancelled' };
    const response = await api.delete(`/reservations/${reservationId}`);
    return response.data;
  },
};

// ─── Wallet API ───
let mockWalletBalance = 500.0;
let mockTransactions: any[] = [
  {
    id: 1,
    wallet_id: 1,
    amount: 500.0,
    type: 'topup',
    status: 'completed',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  }
];

export const walletApi = {
  balance: async () => {
    if (isMockToken(getStoredToken())) return { id: 1, user_id: 1, balance: mockWalletBalance, created_at: new Date().toISOString() };
    const response = await api.get<Wallet>('/wallet/balance');
    return response.data;
  },
  topup: async (amount: number) => {
    if (isMockToken(getStoredToken())) {
      mockWalletBalance += amount;
      mockTransactions.unshift({
        id: Date.now(), wallet_id: 1, amount: amount, type: 'topup', status: 'completed', created_at: new Date().toISOString()
      });
      return { id: 1, user_id: 1, balance: mockWalletBalance, created_at: new Date().toISOString() };
    }
    const response = await api.post<Wallet>('/wallet/topup', { amount });
    return response.data;
  },
  transactions: async () => {
    if (isMockToken(getStoredToken())) return [...mockTransactions];
    const response = await api.get<Transaction[]>('/wallet/transactions');
    return response.data;
  },
};

// ─── Session API ───
export const sessionApi = {
  start: async (payload: { reservation_id: number; start_battery_level: number; charger_qr_code: number }) => {
    if (isMockToken(getStoredToken())) return { id: Date.now(), status: 'active', ...payload };
    const response = await api.post<ChargingSession>('/sessions/start', payload);
    return response.data;
  },
  progress: async (sessionId: number) => {
    if (isMockToken(getStoredToken())) return { current_battery_level: 50, energy_consumed: 10, elapsed_minutes: 15, estimated_cost: 25.5 };
    const response = await api.get(`/sessions/${sessionId}/progress`);
    return response.data;
  },
  complete: async (sessionId: number, end_battery_level: number) => {
    if (isMockToken(getStoredToken())) return { id: sessionId, status: 'completed', end_battery_level };
    const response = await api.post<ChargingSession>(`/sessions/${sessionId}/complete`, { end_battery_level });
    return response.data;
  },
};

// ─── Receipt API ───
export const receiptApi = {
  list: async () => {
    if (isMockToken(getStoredToken())) return [];
    const response = await api.get('/sessions/receipts/my');
    return response.data;
  },
  detail: async (receiptId: number) => {
    if (isMockToken(getStoredToken())) return { id: receiptId, amount: 50.0 };
    const response = await api.get(`/sessions/receipts/${receiptId}`);
    return response.data;
  },
};

export const handleApiError = (error: unknown): ApiError => normalizeAxiosError(error);
