import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type {
  AttendanceImportResult,
  AttendanceMonthSettingsResponse,
  AttendancePreview,
  AttendancePreviewRow,
  AttendanceResponse,
  AttendanceSettings,
  HolidaySettingsResponse,
  ResetAttendancePayrollResult,
  UpdateAttendanceMonthSettingInput,
  UpdateAttendanceSummariesResponse,
  UpdateAttendanceSummaryRowInput,
  UpdateHolidaySettingsInput,
} from "./attendance.types";

export async function getAttendance(month: number, year: number) {
  const response = await api.get<ApiResponse<AttendanceResponse>>("/attendance", {
    params: { month, year },
  });
  return unwrapApiResponse(response.data);
}

export async function getAttendanceSettings() {
  const response = await api.get<ApiResponse<AttendanceSettings>>("/attendance/settings");
  return unwrapApiResponse(response.data);
}

export async function updateAttendanceSettings(values: AttendanceSettings) {
  const response = await api.put<ApiResponse<AttendanceSettings>>("/attendance/settings", values);
  return unwrapApiResponse(response.data);
}

export async function getAttendanceMonthSettings(year: number) {
  const response = await api.get<ApiResponse<AttendanceMonthSettingsResponse>>("/attendance/settings/monthly", {
    params: { year },
  });
  return unwrapApiResponse(response.data);
}

export async function updateAttendanceMonthSetting(values: UpdateAttendanceMonthSettingInput) {
  const response = await api.put<ApiResponse<AttendanceMonthSettingsResponse["rows"][number]>>(
    "/attendance/settings/monthly",
    values,
  );
  return unwrapApiResponse(response.data);
}

export async function getHolidaySettings(year: number) {
  const response = await api.get<ApiResponse<HolidaySettingsResponse>>("/attendance/settings/holidays", {
    params: { year },
  });
  return unwrapApiResponse(response.data);
}

export async function updateHolidaySettings(values: UpdateHolidaySettingsInput) {
  const response = await api.put<ApiResponse<HolidaySettingsResponse>>("/attendance/settings/holidays", values);
  return unwrapApiResponse(response.data);
}

export async function importAttendance(input: {
  file: File;
  month: number;
  year: number;
  autoCreateMissingEmployees: boolean;
}) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("month", String(input.month));
  formData.append("year", String(input.year));
  formData.append("autoCreateMissingEmployees", String(input.autoCreateMissingEmployees));

  const response = await api.post<ApiResponse<AttendanceImportResult>>("/attendance/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return unwrapApiResponse(response.data);
}

export async function previewAttendanceImport(input: { file: File; month: number; year: number }) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("month", String(input.month));
  formData.append("year", String(input.year));

  const response = await api.post<ApiResponse<AttendancePreview>>("/attendance/import/preview", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return unwrapApiResponse(response.data);
}

export async function confirmAttendanceImport(input: {
  fileName?: string;
  month: number;
  year: number;
  autoCreateMissingEmployees: boolean;
  rows: AttendancePreviewRow[];
}) {
  const response = await api.post<ApiResponse<AttendanceImportResult>>("/attendance/import/confirm", input);
  return unwrapApiResponse(response.data);
}

export async function resetAttendancePayroll(input: { month: number; year: number }) {
  const response = await api.post<ApiResponse<ResetAttendancePayrollResult>>("/attendance/reset-period", input);
  return unwrapApiResponse(response.data);
}

export async function updateAttendanceSummaries(rows: UpdateAttendanceSummaryRowInput[]) {
  const response = await api.put<ApiResponse<UpdateAttendanceSummariesResponse>>("/attendance/summary", {
    rows,
  });
  return unwrapApiResponse(response.data);
}
