import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";
import type { AuthSession } from "@/types/auth.types";

import type { LoginFormValues } from "./login.schema";
import type { ChangePasswordFormValues } from "./profile.schema";

export async function login(values: LoginFormValues) {
  const response = await api.post<ApiResponse<AuthSession>>("/auth/login", values);
  return unwrapApiResponse(response.data);
}

export async function getProfile() {
  const response = await api.get<ApiResponse<AuthSession["user"]>>("/auth/profile");
  return unwrapApiResponse(response.data);
}

export async function changePassword(values: ChangePasswordFormValues) {
  const response = await api.put<ApiResponse<{ changed: boolean }>>("/auth/password", values);
  return unwrapApiResponse(response.data);
}
