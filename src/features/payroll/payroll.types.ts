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

export type PayrollFormulaCategory = {
  key: string;
  name: string;
  formula: string;
};

export type PayrollFormulaSetting = {
  insuranceBaseSalary: number;
  employeeInsuranceRate: number;
  employerInsuranceRate: number;
  earningCategories: PayrollFormulaCategory[];
  deductionCategories: PayrollFormulaCategory[];
  dailySalaryFormula: string;
  grossSalaryFormula: string;
  deductionFormula: string;
  netSalaryFormula: string;
};
