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

const MOCK_USERS: Record<string, ProfileResponse> = {
  'mock-token-driver': {
    id: 1,
    email: 'demo@evcharge.test',
    full_name: 'Demo Driver',
    phone_number: '0555 123 4567',
    role: 'driver',
  },
  'mock-token-operator': {
    id: 2,
    email: 'operator@evcharge.test',
    full_name: 'Demo Operator',
    phone_number: '0555 123 4568',
    role: 'operator',
  },
  'mock-token-admin': {
    id: 3,
    email: 'admin@evcharge.test',
    full_name: 'Demo Admin',
    phone_number: '0555 123 4569',
    role: 'admin',
  }
};
const isMockToken = (token: string | null | undefined) => token ? token.startsWith('mock-token') : false;

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
        error.response?.data?.detail || error.response?.data?.message || error.message || 'API request failed',
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
      // Fall back to mock tokens only when backend is unreachable (network error)
      if (axios.isAxiosError(error) && !error.response && payload.password === 'demo123') {
        if (payload.email === 'demo@evcharge.test') return { access_token: 'mock-token-driver', token_type: 'bearer' };
        if (payload.email === 'operator@evcharge.test') return { access_token: 'mock-token-operator', token_type: 'bearer' };
        if (payload.email === 'admin@evcharge.test') return { access_token: 'mock-token-admin', token_type: 'bearer' };
      }
      throw error;
    }
  },
  register: async (payload: SignupPayload) => {
    try {
      const response = await api.post<RegisterResponse>('/auth/register', payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response && payload.email.includes('evcharge.test')) {
        return { message: 'Mock user registered', user_id: 1 };
      }
      throw error;
    }
  },
  me: async () => {
    const token = getStoredToken();
    if (token && isMockToken(token)) {
      // Mock tokens are not valid JWTs - backend would reject them
      if (MOCK_USERS[token]) return MOCK_USERS[token];
    }
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateProfile: async (payload: ProfilePayload) => {
    const token = getStoredToken();
    if (token && MOCK_USERS[token]) {
      MOCK_USERS[token] = { ...MOCK_USERS[token], ...payload, phone_number: payload.phone_number ?? MOCK_USERS[token].phone_number } as ProfileResponse;
      return MOCK_USERS[token];
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

let mockStations: ChargingStation[] = [
  {
    id: 101,
    name: 'Seaside EV Hub',
    latitude: 38.4300,
    longitude: 27.1450,
    address: 'Kordonboyu, Izmir',
    city: 'Izmir',
    operating_hours: '08:00-22:00',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 102,
    name: 'Downtown Fast Charge',
    latitude: 38.4220,
    longitude: 27.1410,
    address: 'Konak, Izmir',
    city: 'Izmir',
    operating_hours: '07:00-23:00',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 103,
    name: 'Green Valley Station',
    latitude: 38.4190,
    longitude: 27.1500,
    address: 'Bostanli, Izmir',
    city: 'Izmir',
    operating_hours: '09:00-20:00',
    status: 'active',
    created_at: new Date().toISOString(),
  }
];

let mockChargers: Record<string, Charger[]> = {
  '101': [
    { id: 1001, station_id: 101, charger_code: 'DC Fast #1', charger_type: 'DC', power_output: 120, connector_type: 'CCS', pricing_per_kwh: 3.5, status: 'available' },
    { id: 1002, station_id: 101, charger_code: 'AC Slow #2', charger_type: 'AC', power_output: 22, connector_type: 'Type2', pricing_per_kwh: 2.0, status: 'available' },
  ],
  '102': [
    { id: 1003, station_id: 102, charger_code: 'CHAdeMO Speed', charger_type: 'DC', power_output: 50, connector_type: 'CHAdeMO', pricing_per_kwh: 2.8, status: 'available' },
    { id: 1004, station_id: 102, charger_code: 'CCS Rapid', charger_type: 'DC', power_output: 50, connector_type: 'CCS', pricing_per_kwh: 2.8, status: 'offline' },
  ],
  '103': [
    { id: 1005, station_id: 103, charger_code: 'Type2 Standard', charger_type: 'AC', power_output: 22, connector_type: 'Type2', pricing_per_kwh: 2.2, status: 'occupied' },
  ]
};

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

let mockIssues: any[] = [
  { id: 1, station_id: 101, charger_id: 1001, description: 'Connector damaged', status: 'open', created_at: new Date().toISOString() },
  { id: 2, station_id: 102, charger_id: 1003, description: 'Payment terminal broken', status: 'in_progress', created_at: new Date().toISOString() },
];

export const stationApi = {
  list: async () => {
    if (isMockToken(getStoredToken())) return mockStations;
    const response = await api.get<ChargingStation[]>('/stations');
    return response.data;
  },
  details: async (stationId: string) => {
    if (isMockToken(getStoredToken())) return mockStations.find(s => String(s.id) === stationId) || mockStations[0];
    const response = await api.get<ChargingStation>(`/stations/${stationId}`);
    return response.data;
  },
  chargers: async (stationId: string | number) => {
    if (isMockToken(getStoredToken())) return mockChargers[stationId] || [];
    const response = await api.get<Charger[]>(`/stations/${stationId}/chargers`);
    return response.data;
  },
  reportIssue: async (payload: { station_id: number; charger_id: number; description: string }) => {
    if (isMockToken(getStoredToken())) {
      const issue = { id: Date.now(), ...payload, status: 'open', created_at: new Date().toISOString() };
      mockIssues.push(issue);
      return issue;
    }
    const response = await api.post('/issues', {
      charger_id: payload.charger_id,
      description: payload.description,
      category: 'hardware',
    });
    return response.data;
  },
};

let mockReservations: any[] = [];

export const reservationApi = {
  list: async () => {
    if (isMockToken(getStoredToken())) return [];
    const response = await api.get('/reservations');
    return response.data;
  },
  getForCharger: async (chargerId: number) => {
    if (isMockToken(getStoredToken())) {
      return mockReservations.filter((r) => r.charger_id === chargerId && r.status === 'confirmed');
    }
    try {
      const response = await api.get(`/reservations/charger/${chargerId}`);
      return response.data;
    } catch (error) {
      return []; // Fallback gracefully if backend endpoint is unavailable
    }
  },
  create: async (payload: any) => {
    if (isMockToken(getStoredToken())) {
      const token = getStoredToken()!;
      const user = MOCK_USERS[token];
      const currentBalance = mockWallets[token] || 0;
      if (currentBalance < 50) {
        throw new Error('Insufficient wallet balance. Minimum 50 TL required.');
      }
      mockWallets[token] -= 50;
      if (!mockTransactions[token]) mockTransactions[token] = [];
      mockTransactions[token].unshift({
        id: Date.now(), wallet_id: user.id, amount: -50, type: 'charge', status: 'completed', created_at: new Date().toISOString()
      });
      const newRes = { id: Date.now(), ...payload, status: 'confirmed', total_cost: 50 };
      mockReservations.push(newRes);
      return newRes;
    }
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
const mockWallets: Record<string, number> = {
  'mock-token-driver': 500.0,
  'mock-token-operator': 0.0,
  'mock-token-admin': 0.0,
};
const mockTransactions: Record<string, any[]> = {
  'mock-token-driver': [
    {
      id: 1,
      wallet_id: 1,
      amount: 500.0,
      type: 'topup',
      status: 'completed',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    }
  ],
};

export const walletApi = {
  balance: async () => {
    const token = getStoredToken();
    if (isMockToken(token)) {
      const user = MOCK_USERS[token!];
      return { id: user.id, user_id: user.id, balance: mockWallets[token!] || 0, created_at: new Date().toISOString() };
    }
    const response = await api.get<Wallet>('/wallet/balance');
    return response.data;
  },
  topup: async (amount: number) => {
    const token = getStoredToken();
    if (isMockToken(token)) {
      const user = MOCK_USERS[token!];
      mockWallets[token!] = (mockWallets[token!] || 0) + amount;
      if (!mockTransactions[token!]) mockTransactions[token!] = [];
      mockTransactions[token!].unshift({
        id: Date.now(), wallet_id: user.id, amount: amount, type: 'topup', status: 'completed', created_at: new Date().toISOString()
      });
      return { id: user.id, user_id: user.id, balance: mockWallets[token!], created_at: new Date().toISOString() };
    }
    const response = await api.post<Wallet>('/wallet/topup', { amount });
    return response.data;
  },
  transactions: async () => {
    const token = getStoredToken();
    if (isMockToken(token)) return [...(mockTransactions[token!] || [])];
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
  getByReservation: async (reservationId: number) => {
    const response = await api.get(`/sessions/by-reservation/${reservationId}`);
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

export const operatorApi = {
  getIssues: async () => {
    if (isMockToken(getStoredToken())) {
      return mockIssues.filter(i => i.status !== 'resolved');
    }
    const response = await api.get('/issues');
    return response.data;
  },
  updateChargerStatus: async (chargerId: number, status: string) => {
    if (isMockToken(getStoredToken())) {
      for (const stationId in mockChargers) {
        const charger = mockChargers[stationId].find(c => c.id === chargerId);
        if (charger) {
          charger.status = status as any;
          if (status === 'offline') {
            const affectedRes = mockReservations.filter(r => r.charger_id === chargerId && r.status === 'confirmed');
            affectedRes.forEach(r => {
              r.status = 'cancelled';
              const token = Object.keys(MOCK_USERS).find(t => MOCK_USERS[t].id === r.user_id);
              if (token && r.total_cost) {
                mockWallets[token] = (mockWallets[token] || 0) + r.total_cost;
                if (!mockTransactions[token]) mockTransactions[token] = [];
                mockTransactions[token].unshift({
                  id: Date.now() + Math.random(), wallet_id: r.user_id, amount: r.total_cost, type: 'refund', status: 'completed', created_at: new Date().toISOString()
                });
              }
            });
          }
          return charger;
        }
      }
      return { id: chargerId, status };
    }
    const response = await api.put(`/admin/chargers/${chargerId}/status`, { status });
    return response.data;
  },
  resolveIssue: async (issueId: number) => {
    if (isMockToken(getStoredToken())) {
      const issue = mockIssues.find(i => i.id === issueId);
      if (issue) issue.status = 'resolved';
      return { id: issueId, status: 'resolved' };
    }
    const response = await api.put(`/issues/${issueId}`, { status: 'resolved' });
    return response.data;
  }
};

export const adminApi = {
  getStats: async () => {
    if (isMockToken(getStoredToken())) {
      return { total_users: 150, active_sessions: 12, total_revenue: 14500.5 };
    }
    const response = await api.get('/admin/stats');
    return response.data;
  }
};

export const notificationApi = {
  list: async () => {
    if (isMockToken(getStoredToken())) return [];
    const response = await api.get('/notifications');
    return response.data;
  },
  unread: async () => {
    if (isMockToken(getStoredToken())) return [];
    const response = await api.get('/notifications/unread');
    return response.data;
  },
  markRead: async (notificationId: number) => {
    if (isMockToken(getStoredToken())) return {};
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
};

export const handleApiError = (error: unknown): ApiError => normalizeAxiosError(error);
