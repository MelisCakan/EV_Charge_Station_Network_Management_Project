'use client';

import axios, { AxiosError, AxiosInstance } from 'axios';
import { ChargingStation } from './types';

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

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
};

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
    const response = await api.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },
  register: async (payload: SignupPayload) => {
    const response = await api.post<RegisterResponse>('/auth/register', payload);
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export type StationPayload = Omit<ChargingStation, 'id' | 'created_at'>;

export const vehicleApi = {
  list: async () => {
    const response = await api.get('/vehicles');
    return response.data;
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
  create: async (payload: StationPayload) => {
    const response = await api.post<ChargingStation>('/stations', payload);
    return response.data;
  },
  update: async (stationId: string, payload: Partial<StationPayload>) => {
    const response = await api.put<ChargingStation>(`/stations/${stationId}`, payload);
    return response.data;
  },
  delete: async (stationId: string) => {
    const response = await api.delete(`/stations/${stationId}`);
    return response.data;
  },
};

export const handleApiError = (error: unknown): ApiError => normalizeAxiosError(error);
