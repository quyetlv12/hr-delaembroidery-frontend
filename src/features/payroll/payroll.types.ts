import type { PayrollEmployeeViewColumn } from "@/features/employee-view-settings/employee-view-settings.types";

export type SalaryPeriod = {
  id: string;
  month: number;
  year: number;
  status: "draft" | "locked";
  lockedAt?: string;
};

export type SalaryRecordDetail = {
  id: string;
  type: string;
  label: string;
  amount: number;
};

export type SalaryRecord = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  positionName: string;
  email: string;
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
  dependentNote?: string;
  status: "draft" | "locked";
  details: SalaryRecordDetail[];
};

export type PayrollRecordEditableField =
  | "configuredSalary"
  | "insuranceSalary"
  | "workDay"
  | "fixedDailySalary"
  | "responsibilityAllowance"
  | "mealAllowance"
  | "phoneAllowance"
  | "kpiAllowance"
  | "dailyTotal"
  | "overtimeWorkDay"
  | "totalWorkDay"
  | "earnedSalary"
  | "overtimeTotal"
  | "grossSalary"
  | "employerInsuranceTotal"
  | "insuranceTotal"
  | "taxTotal"
  | "advanceTotal"
  | "deductionTotal"
  | "netSalary";

export type PayrollRecordUpdateInput = Partial<Record<PayrollRecordEditableField, number>>;

export type PayrollRecordSnapshot = {
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
  status: string;
};

export type PayrollRecordHistoryEntry = {
  id: string;
  action: "update" | "revert" | string;
  periodId: string;
  month: number;
  year: number;
  recordId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  requestedFields: string[];
  changedFields: string[];
  previousSnapshot: PayrollRecordSnapshot;
  nextSnapshot: PayrollRecordSnapshot;
  changedByLoginCode?: string;
  createdAt: string;
};

export type PayrollResponse = {
  period: SalaryPeriod | null;
  records: SalaryRecord[];
  totals: {
    employeeCount: number;
    workDay?: number;
    overtimeTotal?: number;
    netSalary?: number;
  };
  visibleColumns: PayrollEmployeeViewColumn[];
};

export type PayrollFormulaColumnKey =
  | "fixedDailySalary"
  | "responsibilityAllowance"
  | "mealAllowance"
  | "phoneAllowance"
  | "kpiAllowance"
  | "dailyTotal"
  | "earnedSalary"
  | "overtimeTotal"
  | "grossSalary"
  | "employerInsuranceTotal"
  | "insuranceTotal"
  | "taxTotal"
  | "advanceTotal"
  | "deductionTotal"
  | "netSalary";

export type PayrollFormulaColumn = {
  key: PayrollFormulaColumnKey;
  name: string;
  formula: string;
};

export type PayrollFormulaSetting = {
  insuranceBaseSalary: number;
  employeeInsuranceRate: number;
  employerInsuranceRate: number;
  defaultMealAllowance: number;
  defaultPhoneAllowance: number;
  columnFormulas: PayrollFormulaColumn[];
};

export type PayrollFormulaHistoryEntry = {
  id: string;
  action: "update" | "revert" | "template" | string;
  changeNote?: string;
  changedByLoginCode?: string;
  createdAt: string;
  setting: PayrollFormulaSetting;
};

export type PayrollFormulaTemplate = {
  id: string;
  name: string;
  description?: string;
  createdByLoginCode?: string;
  createdAt: string;
  setting: PayrollFormulaSetting;
};
