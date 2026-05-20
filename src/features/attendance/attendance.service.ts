import { api, unwrapApiResponse } from "@/services/api";
import type { ApiResponse } from "@/types/api.types";

import type {
  AttendanceImportResult,
  AttendanceMonthSettingsResponse,
  AttendancePreview,
  AttendancePreviewRow,
  AttendanceResponse,
  AttendanceServerBodyImportInput,
  AttendanceServerManualSyncInput,
  AttendanceServerManualSyncResponse,
  AttendanceServerSettings,
  AttendanceServerSavedStaffListInput,
  AttendanceServerSavedStaffListResponse,
  AttendanceServerStaffListInput,
  AttendanceServerStaffListResponse,
  AttendanceServerStaffSyncResponse,
  AttendanceServerSyncTestInput,
  AttendanceServerSyncTestResponse,
  AttendanceSettings,
  HolidaySettingsResponse,
  ResetAttendancePayrollResult,
  UpdateAttendanceMonthSettingInput,
  UpdateAttendanceServerSettingsInput,
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

export async function testAttendanceServerSync(input: AttendanceServerSyncTestInput) {
  const response = await api.post<ApiResponse<AttendanceServerSyncTestResponse>>(
    "/attendance/server-sync/test",
    input,
  );
  return unwrapApiResponse(response.data);
}

export async function importAttendanceServerBody(input: AttendanceServerBodyImportInput) {
  const response = await api.post<ApiResponse<AttendanceImportResult>>("/attendance/import/confirm", {
    fileName: input.fileName,
    month: input.month,
    year: input.year,
    autoCreateMissingEmployees: false,
    rows: buildAttendanceRowsFromServerBody(input.body, input.month, input.year),
  });
  return unwrapApiResponse(response.data);
}

export async function syncAttendanceServerManual(input: AttendanceServerManualSyncInput) {
  const response = await api.post<ApiResponse<AttendanceServerManualSyncResponse>>(
    "/attendance/server-sync/manual",
    input,
  );
  return unwrapApiResponse(response.data);
}

export async function getAttendanceServerSettings() {
  const response = await api.get<ApiResponse<AttendanceServerSettings>>("/attendance/server-sync/settings");
  return unwrapApiResponse(response.data);
}

export async function updateAttendanceServerSettings(input: UpdateAttendanceServerSettingsInput) {
  const response = await api.put<ApiResponse<AttendanceServerSettings>>("/attendance/server-sync/settings", input);
  return unwrapApiResponse(response.data);
}

export async function listAttendanceServerStaff(input: AttendanceServerStaffListInput) {
  const response = await api.post<ApiResponse<AttendanceServerStaffListResponse>>(
    "/attendance/server-sync/staff",
    input,
  );
  return unwrapApiResponse(response.data);
}

export async function listSavedAttendanceServerStaff(input: AttendanceServerSavedStaffListInput) {
  const response = await api.get<ApiResponse<AttendanceServerSavedStaffListResponse>>(
    "/attendance/server-sync/staff/saved",
    {
      params: input,
    },
  );
  return unwrapApiResponse(response.data);
}

export async function syncAttendanceServerStaff(input: AttendanceServerStaffListInput) {
  const response = await api.post<ApiResponse<AttendanceServerStaffSyncResponse>>(
    "/attendance/server-sync/staff/sync",
    input,
  );
  return unwrapApiResponse(response.data);
}

function buildAttendanceRowsFromServerBody(body: unknown, month: number, year: number): AttendancePreviewRow[] {
  const sourceRows = Array.isArray(body) ? body : isObjectRecord(body) && Array.isArray(body.rows) ? body.rows : [];

  return sourceRows
    .filter(isObjectRecord)
    .map((row) => {
      const employeeCode = valueToString(row.staffNumber);
      const employeeName = valueToString(row.staffName);
      const days = Object.entries(row)
        .map(([key, value]) => {
          const matchedDate = key.match(/^day-(\d{4})-(\d{2})-(\d{2})$/);
          if (!matchedDate) {
            return null;
          }

          const rowYear = Number(matchedDate[1]);
          const rowMonth = Number(matchedDate[2]);
          const rowDay = Number(matchedDate[3]);
          if (rowYear !== year || rowMonth !== month || rowDay < 1 || rowDay > 31) {
            return null;
          }

          const normalizedValue = normalizeYunattDayValue(value);
          if (!hasAttendanceValue(normalizedValue)) {
            return null;
          }

          return {
            date: `${year}-${String(month).padStart(2, "0")}-${String(rowDay).padStart(2, "0")}`,
            column: `${String(month).padStart(2, "0")}-${String(rowDay).padStart(2, "0")}`,
            value: normalizedValue,
            times: extractTimes(normalizedValue),
            workDay: 0,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeMinutes: 0,
            status: "present",
          };
        })
        .filter((day): day is AttendancePreviewRow["days"][number] => day !== null)
        .sort((left, right) => left.date.localeCompare(right.date));

      return {
        employeeCode,
        employeeName,
        days,
      };
    })
    .filter((row) => row.employeeCode && row.days.length > 0);
}

function normalizeYunattDayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(valueToString).filter(Boolean).join("\n");
  }

  return valueToString(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n");
}

function hasAttendanceValue(value: string) {
  return /(\d{1,2})[:h](\d{2})/.test(value) || normalizeSearchValue(value).includes("ca ngay");
}

function extractTimes(value: string) {
  return Array.from(value.matchAll(/(\d{1,2})[:h](\d{2})/g)).map(
    (match) => `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`,
  );
}

function valueToString(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
