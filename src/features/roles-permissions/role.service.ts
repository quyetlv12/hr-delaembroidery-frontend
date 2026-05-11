import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type { RoleFormValues } from "./role.schema";
import type { Role, RoleFormOptions } from "./role.types";

export async function getRoles() {
  const response = await api.get<ApiResponse<Role[]>>("/roles-permissions");
  return unwrapApiResponse(response.data);
}

export async function getRole(id: string) {
  const response = await api.get<ApiResponse<Role>>(`/roles-permissions/${id}`);
  return unwrapApiResponse(response.data);
}

export async function getRoleFormOptions() {
  const response = await api.get<ApiResponse<RoleFormOptions>>("/roles-permissions/form-options");
  return unwrapApiResponse(response.data);
}

export async function createRole(values: RoleFormValues) {
  const response = await api.post<ApiResponse<Role>>("/roles-permissions", values);
  return unwrapApiResponse(response.data);
}

export async function updateRole(id: string, values: RoleFormValues) {
  const response = await api.put<ApiResponse<Role>>(`/roles-permissions/${id}`, values);
  return unwrapApiResponse(response.data);
}

export async function deleteRole(id: string) {
  const response = await api.delete<ApiResponse<{ id: string }>>(`/roles-permissions/${id}`);
  return unwrapApiResponse(response.data);
}
