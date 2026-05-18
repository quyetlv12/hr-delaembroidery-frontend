export type EmployeeStatus = "active" | "inactive" | "probation";

export type Employee = {
  id: string;
  employeeCode: string;
  loginCode?: string;
  timekeepingCode?: string;
  fullName: string;
  avatarUrl?: string;
  gender: "male" | "female" | "other";
  birthday?: string;
  email: string;
  phone?: string;
  cccd?: string;
  address?: string;
  department?: string;
  departmentId?: string;
  position?: string;
  positionId?: string;
  joinDate: string;
  contractType?: string;
  salary: number;
  monthlyBonus?: number;
  shiftCount: number;
  bankAccount?: string;
  bankName?: string;
  taxCode?: string;
  insuranceCode?: string;
  status: EmployeeStatus;
};

export type EmployeeListQuery = {
  search?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  bonusMonth?: number;
  bonusYear?: number;
};

export type EmployeeMonthlyBonusInput = {
  month: number;
  year: number;
  amount: number;
};

export type EmployeeMonthlyBonusHistory = {
  id: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  month: number;
  year: number;
  previousBonus: number;
  newBonus: number;
  changedByLoginCode?: string;
  createdAt: string;
};

export type EmployeeFormOptions = {
  departments: Array<{ label: string; value: string }>;
  positions: Array<{ label: string; value: string }>;
};

export type EmployeeDocument = {
  id: string;
  originalName: string;
  mimeType?: string;
  size: number;
  uploadedAt: string;
};

export type EmployeeSalaryHistory = {
  id: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
  departmentName?: string;
  positionName?: string;
  previousSalary: number;
  newSalary: number;
  changeAmount: number;
  changePercent?: number;
  changeSource: string;
  changeMode?: string;
  changeValue?: number;
  changedByLoginCode?: string;
  createdAt: string;
};

export type SalaryIncreaseInput = {
  employeeIds?: string[];
  mode: "percent" | "amount";
  value: number;
};

export type SalaryIncreaseResult = {
  updated: number;
  employees: Employee[];
};
