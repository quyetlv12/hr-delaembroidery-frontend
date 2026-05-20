import {
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  Calculator,
  FileBarChart,
  History,
  RefreshCw,
  ServerCog,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { permissions, type PermissionCode } from "./permissions";

export type NavItem = {
  label: string;
  path: string;
  permission: PermissionCode;
  icon: typeof BarChart3;
};

export const navItems: NavItem[] = [
  {
    label: "Tổng quan",
    path: "/",
    permission: permissions.dashboardRead,
    icon: BarChart3,
  },
  {
    label: "Nhân viên",
    path: "/employees",
    permission: permissions.employeesRead,
    icon: Users,
  },
  {
    label: "Lịch sử tăng lương",
    path: "/employees/salary-history",
    permission: permissions.employeesRead,
    icon: History,
  },
  {
    label: "Phòng ban & chức vụ",
    path: "/organization",
    permission: permissions.employeesRead,
    icon: Building2,
  },
  {
    label: "Chấm công",
    path: "/attendance",
    permission: permissions.attendanceRead,
    icon: CalendarClock,
  },
  {
    label: "Test đồng bộ",
    path: "/attendance/server-sync-test",
    permission: permissions.attendanceImport,
    icon: RefreshCw,
  },
  {
    label: "Máy chấm công",
    path: "/attendance/server-sync-settings",
    permission: permissions.attendanceImport,
    icon: ServerCog,
  },
  {
    label: "Cài đặt chấm công",
    path: "/attendance/settings",
    permission: permissions.attendanceImport,
    icon: Settings,
  },
  {
    label: "Ngày lễ",
    path: "/attendance/holidays",
    permission: permissions.attendanceImport,
    icon: CalendarDays,
  },
  {
    label: "Bảng lương",
    path: "/payroll",
    permission: permissions.payrollRead,
    icon: Banknote,
  },
  {
    label: "Công thức lương",
    path: "/payroll/formulas",
    permission: permissions.payrollCalculate,
    icon: Calculator,
  },
  {
    label: "Vai trò",
    path: "/roles-permissions",
    permission: permissions.rolesRead,
    icon: ShieldCheck,
  },
  {
    label: "Báo cáo",
    path: "/reports",
    permission: permissions.reportsRead,
    icon: FileBarChart,
  },
];
