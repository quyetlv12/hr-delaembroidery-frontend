import axios from "axios";

import { showApiError } from "@/lib/toast";
import type { ApiResponse } from "@/types/api.types";
import type { AuthSession } from "@/types/auth.types";

const SESSION_KEY = "hrm.auth.session";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const rawSession = localStorage.getItem(SESSION_KEY);
  if (!rawSession) {
    return config;
  }

  const session = JSON.parse(rawSession) as AuthSession;
  config.headers.Authorization = `Bearer ${session.accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = axios.isAxiosError(error) && error.config?.url?.includes("/auth/login");

    if (isLoginRequest) {
      return Promise.reject(error);
    }

    showApiError(error);

    if (axios.isAxiosError(error) && error.response?.status === 401 && !isLoginRequest) {
      sessionStorageAdapter.clear();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export const sessionStorageAdapter = {
  key: SESSION_KEY,
  get(): AuthSession | null {
    const rawSession = localStorage.getItem(SESSION_KEY);
    return rawSession ? (JSON.parse(rawSession) as AuthSession) : null;
  },
  set(session: AuthSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
  },
};

export function unwrapApiResponse<T>(payload: ApiResponse<T>): T {
  if (payload.success) {
    return payload.data;
  }

  throw new Error(payload.error.message);
}
