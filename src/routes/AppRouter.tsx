import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/common/LoadingState";
import { permissions } from "@/constants/permissions";
import { LoginPage } from "@/features/auth/LoginPage";

import { ProtectedRoute } from "./ProtectedRoute";

const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const ProfilePage = lazy(() =>
  import("@/features/auth/ProfilePage").then((module) => ({ default: module.ProfilePage })),
);
const EmployeesPage = lazy(() =>
  import("@/features/employees/EmployeesPage").then((module) => ({ default: module.EmployeesPage })),
);
const EmployeeFormPage = lazy(() =>
  import("@/features/employees/EmployeeFormPage").then((module) => ({ default: module.EmployeeFormPage })),
);
const EmployeeDetailPage = lazy(() =>
  import("@/features/employees/EmployeeDetailPage").then((module) => ({ default: module.EmployeeDetailPage })),
);
const EmployeeSalaryHistoryPage = lazy(() =>
  import("@/features/employees/EmployeeSalaryHistoryPage").then((module) => ({
    default: module.EmployeeSalaryHistoryPage,
  })),
);
const OrganizationPage = lazy(() =>
  import("@/features/organization/OrganizationPage").then((module) => ({ default: module.OrganizationPage })),
);
const OrganizationFormPage = lazy(() =>
  import("@/features/organization/OrganizationFormPage").then((module) => ({
    default: module.OrganizationFormPage,
  })),
);
const AttendancePage = lazy(() =>
  import("@/features/attendance/AttendancePage").then((module) => ({ default: module.AttendancePage })),
);
const AttendanceImportPage = lazy(() =>
  import("@/features/attendance/AttendanceImportPage").then((module) => ({
    default: module.AttendanceImportPage,
  })),
);
const AttendanceServerSyncTestPage = lazy(() =>
  import("@/features/attendance/AttendanceServerSyncTestPage").then((module) => ({
    default: module.AttendanceServerSyncTestPage,
  })),
);
const AttendanceServerSettingsPage = lazy(() =>
  import("@/features/attendance/AttendanceServerSettingsPage").then((module) => ({
    default: module.AttendanceServerSettingsPage,
  })),
);
const AttendanceSettingsPage = lazy(() =>
  import("@/features/attendance/AttendanceSettingsPage").then((module) => ({
    default: module.AttendanceSettingsPage,
  })),
);
const HolidaySettingsPage = lazy(() =>
  import("@/features/attendance/HolidaySettingsPage").then((module) => ({
    default: module.HolidaySettingsPage,
  })),
);
const PayrollPage = lazy(() =>
  import("@/features/payroll/PayrollPage").then((module) => ({ default: module.PayrollPage })),
);
const PayrollFormulaSettingsPage = lazy(() =>
  import("@/features/payroll/PayrollFormulaSettingsPage").then((module) => ({
    default: module.PayrollFormulaSettingsPage,
  })),
);
const EmailSettingsPage = lazy(() =>
  import("@/features/email-settings/EmailSettingsPage").then((module) => ({
    default: module.EmailSettingsPage,
  })),
);
const RolesPermissionsPage = lazy(() =>
  import("@/features/roles-permissions/RolesPermissionsPage").then((module) => ({
    default: module.RolesPermissionsPage,
  })),
);
const RoleFormPage = lazy(() =>
  import("@/features/roles-permissions/RoleFormPage").then((module) => ({
    default: module.RoleFormPage,
  })),
);
const ReportsPage = lazy(() =>
  import("@/features/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })),
);

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingState label="Đang tải màn hình..." />}>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route element={<DashboardPage />} index />
          <Route element={<ProfilePage />} path="profile" />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesRead}>
                <EmployeesPage />
              </ProtectedRoute>
            }
            path="employees"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesRead}>
                <EmployeeSalaryHistoryPage />
              </ProtectedRoute>
            }
            path="employees/salary-history"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesRead}>
                <EmployeeDetailPage />
              </ProtectedRoute>
            }
            path="employees/:id"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesCreate}>
                <EmployeeFormPage />
              </ProtectedRoute>
            }
            path="employees/new"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesUpdate}>
                <EmployeeFormPage />
              </ProtectedRoute>
            }
            path="employees/:id/edit"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesRead}>
                <OrganizationPage />
              </ProtectedRoute>
            }
            path="organization"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesCreate}>
                <OrganizationFormPage />
              </ProtectedRoute>
            }
            path="organization/:entity/new"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.employeesUpdate}>
                <OrganizationFormPage />
              </ProtectedRoute>
            }
            path="organization/:entity/:id/edit"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.attendanceRead}>
                <AttendancePage />
              </ProtectedRoute>
            }
            path="attendance"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.attendanceImport}>
                <AttendanceImportPage />
              </ProtectedRoute>
            }
            path="attendance/import"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.attendanceImport}>
                <AttendanceServerSyncTestPage />
              </ProtectedRoute>
            }
            path="attendance/server-sync-test"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.attendanceImport}>
                <AttendanceServerSettingsPage />
              </ProtectedRoute>
            }
            path="attendance/server-sync-settings"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.attendanceImport}>
                <AttendanceSettingsPage />
              </ProtectedRoute>
            }
            path="attendance/settings"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.attendanceImport}>
                <HolidaySettingsPage />
              </ProtectedRoute>
            }
            path="attendance/holidays"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.payrollRead}>
                <PayrollPage />
              </ProtectedRoute>
            }
            path="payroll"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.payrollCalculate}>
                <PayrollFormulaSettingsPage />
              </ProtectedRoute>
            }
            path="payroll/formulas"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.payslipEmailSend}>
                <EmailSettingsPage />
              </ProtectedRoute>
            }
            path="settings/email"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.rolesRead}>
                <RolesPermissionsPage />
              </ProtectedRoute>
            }
            path="roles-permissions"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.rolesManage}>
                <RoleFormPage />
              </ProtectedRoute>
            }
            path="roles-permissions/new"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.rolesManage}>
                <RoleFormPage />
              </ProtectedRoute>
            }
            path="roles-permissions/:id/edit"
          />
          <Route
            element={
              <ProtectedRoute permission={permissions.reportsRead}>
                <ReportsPage />
              </ProtectedRoute>
            }
            path="reports"
          />
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  );
}
