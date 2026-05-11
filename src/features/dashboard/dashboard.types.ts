export type DashboardSummary = {
  totalEmployees: number;
  activeEmployees: number;
  todayLateEmployees: number;
  monthlyPayroll: number;
  overtimeHours: number;
  payrollByMonth: Array<{ month: string; amount: number }>;
  attendanceByDay: Array<{ day: string; present: number; late: number }>;
  employeesByDepartment: Array<{ department: string; total: number }>;
  employeeGrowth: Array<{ month: string; total: number }>;
};
