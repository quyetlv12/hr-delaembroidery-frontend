import {
  payrollEmployeeViewColumns,
  type PayrollEmployeeViewColumn,
} from "@/features/employee-view-settings/employee-view-settings.types";

const hiddenPayrollColumns: PayrollEmployeeViewColumn[] = ["dependentNote", "email", "status"];

export const payrollDisplayColumns = payrollEmployeeViewColumns.filter(
  (column) => !hiddenPayrollColumns.includes(column),
);

export const payrollColumnLabels: Record<PayrollEmployeeViewColumn, string> = {
  employeeCode: "Mã NV",
  employeeName: "Họ và tên",
  departmentName: "Phòng ban",
  positionName: "Chức vụ",
  email: "Email",
  configuredSalary: "Thực hưởng",
  insuranceSalary: "Lương BHXH",
  fixedDailySalary: "Lương cố định",
  responsibilityAllowance: "Trách nhiệm",
  mealAllowance: "Ăn ca",
  phoneAllowance: "Điện thoại",
  kpiAllowance: "KPI",
  dailyTotal: "Tổng cộng",
  workDay: "Số công",
  overtimeWorkDay: "Công tăng ca",
  totalWorkDay: "Tổng công",
  earnedSalary: "Lương trong tháng",
  overtimeTotal: "Lương tăng ca",
  grossSalary: "Tổng lương",
  employerInsuranceTotal: "BHXH công ty",
  insuranceTotal: "BHXH NLĐ",
  taxTotal: "Thuế TNCN",
  advanceTotal: "Tạm ứng",
  deductionTotal: "Tổng giảm trừ",
  bonus: "Thưởng",
  netSalary: "Thực nhận",
  dependentNote: "Ghi chú NPT",
  status: "Trạng thái",
};

export function filterPayrollDisplayColumns(columns: PayrollEmployeeViewColumn[]) {
  const selectedSet = new Set(columns);
  return payrollDisplayColumns.filter((column) => selectedSet.has(column));
}
