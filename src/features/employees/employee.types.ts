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
};

export type EmployeeFormOptions = {
  departments: Array<{ label: string; value: string }>;
  positions: Array<{ label: string; value: string }>;
};
