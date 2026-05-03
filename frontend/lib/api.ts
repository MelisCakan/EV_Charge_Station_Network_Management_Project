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
        if (payload.email === MOCK_USER.email) {
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

export const handleApiError = (error: unknown): ApiError => normalizeAxiosError(error);
