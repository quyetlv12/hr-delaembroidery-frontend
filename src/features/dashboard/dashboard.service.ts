import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type { DashboardSummary } from "./dashboard.types";

export type DashboardFilter = {
  employeeId?: string;
  from?: string;
  to?: string;
};

export async function getDashboardSummary(filter: DashboardFilter = {}) {
  const response = await api.get<ApiResponse<DashboardSummary>>("/dashboard/summary", {
    params: {
      employeeId: filter.employeeId || undefined,
      from: filter.from || undefined,
      to: filter.to || undefined,
    },
  });
  return unwrapApiResponse(response.data);
}
