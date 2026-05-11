export const permissions = {
  dashboardRead: "dashboard:read",
  employeesRead: "employees:read",
  employeesCreate: "employees:create",
  employeesUpdate: "employees:update",
  employeesDelete: "employees:delete",
  attendanceRead: "attendance:read",
  attendanceImport: "attendance:import",
  payrollRead: "payroll:read",
  payrollCalculate: "payroll:calculate",
  payrollLock: "payroll:lock",
  payslipEmailSend: "payslip-email:send",
  bankTransferRead: "bank-transfer:read",
  bankTransferExport: "bank-transfer:export",
  rolesRead: "roles:read",
  rolesManage: "roles:manage",
  reportsRead: "reports:read",
} as const;

export type PermissionCode = (typeof permissions)[keyof typeof permissions];
