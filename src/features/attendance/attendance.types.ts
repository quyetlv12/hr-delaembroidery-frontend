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
  id: string;
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
