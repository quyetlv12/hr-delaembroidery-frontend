import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type { DashboardSummary } from "./dashboard.types";

export async function getDashboardSummary() {
  const response = await api.get<ApiResponse<DashboardSummary>>("/dashboard/summary");
  return unwrapApiResponse(response.data);
}
