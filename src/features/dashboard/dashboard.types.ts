export type DashboardSummary = {
  totalEmployees: number;
  activeEmployees: number;
  todayLateEmployees: number;
  todayLateEmployeeRows: Array<{
    employeeId: string;
    employeeCode: string;
    fullName: string;
    avatarUrl: string | null;
    departmentName: string;
    positionName: string;
    lateMinutes: number;
    firstCheckInAt: string | null;
  }>;
  monthlyPayroll: number;
  overtimeHours: number;
  payrollByMonth: Array<{ month: string; amount: number }>;
  attendanceByDay: Array<{ day: string; present: number; late: number }>;
  employeesByDepartment: Array<{ department: string; total: number }>;
  employeeGrowth: Array<{ month: string; total: number }>;
  todayShiftAbsences: {
    date: string;
    shiftKey: "morning" | "afternoon" | "night" | "none";
    shiftLabel: string;
    startTime: string | null;
    endTime: string | null;
    total: number;
    rows: Array<{
      employeeId: string;
      employeeCode: string;
      fullName: string;
      avatarUrl: string | null;
      departmentName: string;
      positionName: string;
      shiftCount: number;
    }>;
  };
};
