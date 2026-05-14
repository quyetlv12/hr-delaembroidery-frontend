import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type { EmployeeViewSettings } from "./employee-view-settings.types";

export async function getEmployeeViewSettings() {
  const response = await api.get<ApiResponse<EmployeeViewSettings>>("/employee-view-settings");
  return unwrapApiResponse(response.data);
}

export async function updateEmployeeViewSettings(values: EmployeeViewSettings) {
  const response = await api.put<ApiResponse<EmployeeViewSettings>>("/employee-view-settings", values);
  return unwrapApiResponse(response.data);
}
