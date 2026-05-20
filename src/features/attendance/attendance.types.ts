import type { PayrollResponse } from "@/features/payroll/payroll.types";
import type { AttendanceEmployeeViewColumn } from "@/features/employee-view-settings/employee-view-settings.types";

export type AttendanceSummaryRow = {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  workDate?: string;
  checkInAt?: string;
  checkOutAt?: string;
  morningCheckInAt?: string;
  morningCheckOutAt?: string;
  afternoonCheckInAt?: string;
  afternoonCheckOutAt?: string;
  nightCheckInAt?: string;
  nightCheckOutAt?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  workDay?: number;
  status?: "present" | "leave" | "missing_punch";
};

export type AttendanceResponse = {
  month: number;
  year: number;
  rows: AttendanceSummaryRow[];
  totals: {
    rows: number;
    workDay?: number;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    overtimeMinutes?: number;
  };
  visibleColumns: AttendanceEmployeeViewColumn[];
};

export type AttendanceSettings = {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  nightStart: string;
  nightEnd: string;
  overtimeRate: number;
};

export type AttendanceMonthSetting = {
  month: number;
  year: number;
  standardWorkDay: number;
  holidayPaidDays: number;
  holidayBonusAmount: number;
  holidayBonusTotal: number;
};

export type AttendanceMonthSettingsResponse = {
  year: number;
  rows: AttendanceMonthSetting[];
};

export type HolidaySetting = {
  id: string;
  date: string;
  name: string;
  isPaid: boolean;
  amount: number;
};

export type HolidaySettingsResponse = {
  year: number;
  holidays: HolidaySetting[];
};

export type UpdateHolidaySettingsInput = {
  year: number;
  holidays: Array<{
    date: string;
    amount: number;
  }>;
};

export type UpdateAttendanceMonthSettingInput = {
  month: number;
  year: number;
  standardWorkDay: number;
  holidayPaidDays: number;
  holidayBonusAmount: number;
};

export type UpdateAttendanceSummaryRowInput = {
  id?: string;
  employeeId?: string;
  workDate?: string;
  morningCheckIn: string | null;
  morningCheckOut: string | null;
  afternoonCheckIn: string | null;
  afternoonCheckOut: string | null;
  nightCheckIn: string | null;
  nightCheckOut: string | null;
};

export type UpdateAttendanceSummariesResponse = {
  rows: AttendanceSummaryRow[];
};

export type AttendanceImportResult = {
  fileName: string;
  month: number;
  year: number;
  importedEmployees: number;
  createdEmployees: number;
  attendanceRows: number;
  attendanceLogs: number;
  unmatchedRows: Array<{ code: string; name: string }>;
  payroll: PayrollResponse;
};

export type ResetAttendancePayrollResult = {
  month: number;
  year: number;
  attendanceLogs: number;
  attendanceRows: number;
  payrollPeriods: number;
  payrollRecords: number;
  salaryDetails: number;
  salaryEmailLogs: number;
  preservedBonuses: number;
};

export type AttendancePayrollPreviewRecord = {
  employeeId?: string;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  positionName?: string;
  email?: string;
  configuredSalary: number;
  insuranceSalary: number;
  workDay: number;
  standardWorkDay: number;
  fixedDailySalary: number;
  responsibilityAllowance: number;
  mealAllowance: number;
  phoneAllowance: number;
  kpiAllowance: number;
  dailyTotal: number;
  overtimeWorkDay: number;
  totalWorkDay: number;
  baseSalary: number;
  earnedSalary: number;
  allowanceTotal: number;
  bonusTotal: number;
  overtimeTotal: number;
  grossSalary: number;
  employerInsuranceTotal: number;
  insuranceTotal: number;
  totalInsurance: number;
  taxTotal: number;
  advanceTotal: number;
  deductionTotal: number;
  netSalary: number;
};

export type AttendancePayrollPreview = {
  records: AttendancePayrollPreviewRecord[];
  totals: {
    employeeCount: number;
    workDay: number;
    netSalary: number;
  };
};

export type AttendancePreviewDay = {
  date: string;
  column: string;
  value: string;
  times: string[];
  workDay: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: string;
};

export type AttendancePreviewRow = {
  employeeCode: string;
  employeeName: string;
  matchedEmployeeId?: string;
  matchedEmployeeCode?: string;
  matchedEmployeeName?: string;
  days: AttendancePreviewDay[];
};

export type AttendancePreview = {
  fileName: string;
  month: number;
  year: number;
  rows: AttendancePreviewRow[];
  payrollPreview: AttendancePayrollPreview;
  totals: {
    employees: number;
    attendanceRows: number;
    unmatchedRows: number;
  };
};

export type AttendanceServerSyncTestInput = {
  endpoint: string;
  cookie?: string;
  monthDataId: string;
  order: "asc" | "desc";
  offset: number;
  limit: number;
  search: string;
};

export type AttendanceServerBodyImportInput = {
  month: number;
  year: number;
  fileName?: string;
  body: unknown;
};

export type AttendanceServerManualSyncInput = {
  monthDataId: string;
  sourcePeriod?: string;
  month: number;
  year: number;
};

export type AttendanceServerManualSyncResponse = {
  requested: {
    monthDataId: string;
    sourcePeriod: string | null;
    month: number;
    year: number;
  };
  total: number;
  fetchedRows: number;
  importedEmployees: number;
  attendanceRows: number;
  attendanceLogs: number;
  unmatchedRows: Array<{ code: string; name: string }>;
  payroll: PayrollResponse;
};

export type AttendanceServerSyncTestRow = {
  staffNumber: string;
  staffName: string;
  days: Record<string, string[]>;
  presentDays: number;
  punchCount: number;
};

export type AttendanceServerSyncTestResponse = {
  requested: {
    endpoint: string;
    monthDataId: string;
    order: "asc" | "desc";
    offset: number;
    limit: number;
    search: string;
  };
  total: number;
  fetchedRows: number;
  dates: string[];
  rows: AttendanceServerSyncTestRow[];
  rawRows: Array<Record<string, unknown>>;
};

export type AttendanceServerStaffListInput = {
  endpoint: string;
  cookie?: string;
  sort: string;
  order: "asc" | "desc";
  offset: number;
  limit: number;
  search: string;
};

export type AttendanceServerStaffRow = {
  id: string;
  enrollid: string;
  staffNumber: string;
  name: string;
  departmentName: string;
  email: string;
  mobile: string;
  staffStatus: number | null;
  punch: boolean;
  photo: string;
};

export type AttendanceServerSavedStaffListInput = {
  offset: number;
  limit: number;
  search: string;
};

export type AttendanceServerSavedStaffRow = AttendanceServerStaffRow & {
  yunattId: string;
  idNumber: string;
  icCard: string;
  punchPwd: string;
  departmentId: string;
  staffTypeId: string;
  staffType: string;
  staffDate: string;
  sex: number | null;
  stationId: string;
  station: string;
  address: string;
  degreeId: string;
  degree: string;
  phone: string;
  remark: string;
  appLogin: boolean;
  senior: boolean;
  admin: boolean;
  superAdmin: boolean;
  leave: boolean;
  leaveType: string;
  leaveDate: string;
  leaveReason: string;
  needApp: string;
  customerId: string;
  gmtCreate: string;
  gmtModified: string;
  fingerNum: number | null;
  faceNum: number | null;
  picNum: number | null;
  attenceMachineIds: string;
  deviceNames: string;
  groupNames: string;
  rawPayload: Record<string, unknown> | null;
  lastSyncedAt: string | null;
  syncedByLoginCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceServerSavedStaffListResponse = {
  offset: number;
  limit: number;
  search: string;
  total: number;
  rows: AttendanceServerSavedStaffRow[];
};

export type AttendanceServerStaffListResponse = {
  requested: {
    endpoint: string;
    sort: string;
    order: "asc" | "desc";
    offset: number;
    limit: number;
    search: string;
  };
  total: number;
  fetchedRows: number;
  rows: AttendanceServerStaffRow[];
  rawRows: Array<Record<string, unknown>>;
};

export type AttendanceServerStaffSyncResponse = {
  requested: AttendanceServerStaffListResponse["requested"];
  total: number;
  fetchedRows: number;
  savedRows: number;
  rows: AttendanceServerSavedStaffRow[];
};

export type AttendanceServerSettings = {
  attendanceEndpoint: string;
  staffEndpoint: string;
  hasCookie: boolean;
  cookiePreview: string;
  updatedAt: string | null;
  updatedByLoginCode: string | null;
  autoSyncEnabled: boolean;
  autoSyncMonthDataId: string;
  autoSyncMonthMappings: Array<{ period: string; monthDataId: string }>;
  autoSyncStartOffsetMinutes: number;
  autoSyncWindowMinutes: number;
  autoSyncIntervalMinutes: number;
  autoSyncLastRunAt: string | null;
  autoSyncLastStatus: string | null;
  autoSyncLastMessage: string | null;
};

export type UpdateAttendanceServerSettingsInput = {
  attendanceEndpoint: string;
  staffEndpoint: string;
  cookie?: string;
  autoSyncEnabled?: boolean;
  autoSyncMonthDataId?: string;
  autoSyncMonthMappings?: Array<{ period: string; monthDataId: string }>;
  autoSyncStartOffsetMinutes?: number;
  autoSyncWindowMinutes?: number;
  autoSyncIntervalMinutes?: number;
};
