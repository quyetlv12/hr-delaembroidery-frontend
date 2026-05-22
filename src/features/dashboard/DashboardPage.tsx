import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Clock,
  DollarSign,
  LogIn,
  LogOut,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/common/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEmployees } from "@/features/employees/employee.service";
import { toVietnamDateString, VIETNAM_TIME_ZONE } from "@/lib/vietnam-time";

import { DashboardFilters } from "./components/DashboardFilters";
import { getDashboardSummary } from "./dashboard.service";
import type { DashboardSummary } from "./dashboard.types";

// ── Formatters ──────────────────────────────────────────────────────────────
const vndFmt = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const shortVndFmt = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const numberFmt = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

type TodayLateEmployeeRow = DashboardSummary["todayLateEmployeeRows"][number];

// ── Palette ─────────────────────────────────────────────────────────────────
const PIE_COLORS = [
  "#F05423",
  "#0f766e",
  "#0284c7",
  "#7c3aed",
  "#db2777",
  "#c2410c",
  "#0891b2",
  "#65a30d",
];

// ── Default range (last 6 months) ───────────────────────────────────────────
function getDefaultRange() {
  const now = new Date();
  const [year, month] = toVietnamDateString(now).split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 6, 1));
  const to = new Date(Date.UTC(year, month, 0));
  return {
    from: toVietnamDateString(from),
    to: toVietnamDateString(to),
  };
}

// ── Stat card config ─────────────────────────────────────────────────────────
type StatCard = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  money = false,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      {label && <p className="mb-1.5 font-semibold text-card-foreground">{label}</p>}
      {payload.map((entry) => (
        <div className="flex items-center gap-2" key={entry.name}>
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-card-foreground">
            {money ? vndFmt.format(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Chart card wrapper ────────────────────────────────────────────────────────
function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function AbsentEmployeesCard({
  data,
}: {
  data: {
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
}) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <UserX size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-amber-950">
              Nhân viên chưa chấm công {data.shiftKey === "none" ? "" : data.shiftLabel.toLowerCase()}
            </h2>
            <p className="mt-1 text-xs font-medium text-amber-800/80">
              {data.shiftKey === "none"
                ? "Hiện không nằm trong khung giờ ca làm cần theo dõi."
                : `Ngày ${formatDashboardDate(data.date)} · ${data.startTime} - ${data.endTime}`}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-sm font-bold tabular-nums text-amber-700">
          {data.total} người
        </span>
      </div>

      {data.shiftKey === "none" ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
          Danh sách sẽ tự hiển thị khi đến giờ ca sáng, ca chiều hoặc ca 3.
        </div>
      ) : data.total === 0 ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Tất cả nhân viên thuộc {data.shiftLabel.toLowerCase()} đã có lượt chấm công vào ca.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.rows.map((employee) => (
            <div
              className="flex min-w-0 items-start gap-3 rounded-lg border border-amber-200 bg-background px-3 py-3"
              key={employee.employeeId}
            >
              <EmployeeAvatar employee={employee} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800">
                    {employee.employeeCode}
                  </span>
                  <p className="min-w-0 text-sm font-semibold leading-5 text-foreground">
                    {employee.fullName}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground/80">{employee.departmentName}</span>
                  <span className="mx-1 text-muted-foreground/70">·</span>
                  {employee.positionName}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-700">
                  {employee.shiftCount} ca/ngày
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LateEmployeesCard({
  rows,
}: {
  rows: TodayLateEmployeeRow[];
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<TodayLateEmployeeRow | null>(null);
  const visibleRows = rows.slice(0, 10);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-rose-950">Nhân viên đi trễ hôm nay</h2>
            <p className="mt-1 text-xs font-medium text-rose-800/80">
              Danh sách sắp xếp theo số phút trễ giảm dần.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-sm font-bold tabular-nums text-rose-700">
          {rows.length} người
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Chưa có nhân viên đi trễ trong ngày hôm nay.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleRows.map((employee) => (
            <button
              aria-label={`Xem chi tiết chấm công của ${employee.fullName}`}
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-rose-200 bg-background px-3 py-2 text-left transition hover:border-rose-300 hover:bg-rose-100/70 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300/50"
              key={employee.employeeId}
              type="button"
              onClick={() => setSelectedEmployee(employee)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <EmployeeAvatar employee={employee} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {employee.employeeCode} · {employee.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {employee.departmentName} · {employee.positionName}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-rose-700">{employee.lateMinutes} phút</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {employee.firstCheckInAt ? `Vào ${employee.firstCheckInAt}` : "Chưa rõ giờ vào"}
                </p>
              </div>
            </button>
          ))}
          {hiddenCount > 0 ? (
            <div className="rounded-lg border border-dashed border-rose-300 bg-background/70 px-3 py-2 text-center text-sm font-semibold text-rose-700">
              +{hiddenCount} người khác
            </div>
          ) : null}
        </div>
      )}

      <LateAttendanceDialog
        employee={selectedEmployee}
        isOpen={Boolean(selectedEmployee)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmployee(null);
          }
        }}
      />
    </section>
  );
}

function LateAttendanceDialog({
  employee,
  isOpen,
  onOpenChange,
}: {
  employee: TodayLateEmployeeRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!employee) {
    return null;
  }

  const allPunches = employee.attendance.shifts.flatMap((shift) =>
    [
      shift.checkInAt ? { label: `${shift.label} vào`, value: shift.checkInAt } : null,
      shift.checkOutAt ? { label: `${shift.label} ra`, value: shift.checkOutAt } : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Chi tiết chấm công - {employee.employeeCode} - {employee.fullName}
          </DialogTitle>
          <DialogDescription>
            Ngày {formatDashboardDate(employee.attendance.date)} · hiển thị đầy đủ giờ vào/ra từng ca trong ngày.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-4">
          <LateMetric label="Ngày công" value={`${numberFmt.format(employee.attendance.workDay)} công`} />
          <LateMetric label="Đi trễ" tone="danger" value={`${employee.attendance.lateMinutes} phút`} />
          <LateMetric label="Về sớm" value={`${employee.attendance.earlyLeaveMinutes} phút`} />
          <LateMetric label="Tăng ca" value={`${employee.attendance.overtimeMinutes} phút`} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {employee.attendance.shifts.map((shift) => {
            const hasPunch = Boolean(shift.checkInAt || shift.checkOutAt);
            return (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm" key={shift.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-card-foreground">{shift.label}</h3>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      Ca chuẩn {shift.plannedStart} - {shift.plannedEnd}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                      hasPunch ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {hasPunch ? "Có chấm" : "Chưa chấm"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  <ShiftTimeRow icon={LogIn} label="Giờ vào" value={shift.checkInAt} />
                  <ShiftTimeRow icon={LogOut} label="Giờ ra" value={shift.checkOutAt} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-rose-950">Tất cả mốc chấm công trong ngày</h3>
            <span className="rounded-full bg-background px-2 py-1 text-xs font-bold text-rose-700">
              {allPunches.length} lượt
            </span>
          </div>
          {allPunches.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Chưa có dữ liệu chấm công trong ngày.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {allPunches.map((punch) => (
                <span
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-background px-3 py-2 text-sm font-semibold text-foreground"
                  key={`${punch.label}-${punch.value}`}
                >
                  <Clock className="text-rose-600" size={14} />
                  <span className="text-muted-foreground">{punch.label}</span>
                  <span className="tabular-nums">{punch.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LateMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-border bg-muted/30 text-foreground"
      }`}
    >
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ShiftTimeRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon size={15} />
        {label}
      </span>
      <span className="font-mono text-sm font-bold tabular-nums text-foreground">{value ?? "--:--"}</span>
    </div>
  );
}

function EmployeeAvatar({
  employee,
}: {
  employee: {
    fullName: string;
    avatarUrl: string | null;
  };
}) {
  if (employee.avatarUrl) {
    return (
      <img
        alt={employee.fullName}
        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted object-cover"
        src={employee.avatarUrl}
      />
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-100 text-sm font-bold text-amber-700">
      {employee.fullName.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function formatDashboardDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [employeeId, setEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);

  // Employee options for filter
  const employeesQuery = useQuery({
    queryKey: ["dashboard-employees"],
    queryFn: () => getEmployees(),
    staleTime: 5 * 60 * 1000,
  });

  const employeeOptions = useMemo(
    () =>
      (employeesQuery.data ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.employeeCode} — ${emp.fullName}`,
      })),
    [employeesQuery.data],
  );

  // Dashboard summary with filters
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", employeeId, fromDate, toDate],
    queryFn: () =>
      getDashboardSummary({
        employeeId: employeeId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  });

  const handleFilterChange = (next: {
    employeeId: string;
    fromDate: string;
    toDate: string;
  }) => {
    setEmployeeId(next.employeeId);
    setFromDate(next.fromDate);
    setToDate(next.toDate);
  };

  const handleReset = () => {
    setEmployeeId("");
    setFromDate(defaultRange.from);
    setToDate(defaultRange.to);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tổng quan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Số liệu nhân sự, chấm công và bảng lương theo thời gian thực.
          </p>
        </div>
        <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground sm:inline-block">
          {new Date().toLocaleDateString("vi-VN", {
            timeZone: VIETNAM_TIME_ZONE,
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      </div>

      {/* ── Filters ── */}
      <DashboardFilters
        employeeId={employeeId}
        employeeOptions={employeeOptions}
        fromDate={fromDate}
        isLoadingEmployees={employeesQuery.isLoading}
        toDate={toDate}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* ── Loading / Error ── */}
      {summaryQuery.isLoading && <LoadingState label="Đang tải tổng quan..." />}
      {summaryQuery.isError && (
        <ErrorState message="Không kết nối được API tổng quan." />
      )}

      {/* ── Content ── */}
      {summaryQuery.data && (
        <DashboardContent
          attendanceByDay={summaryQuery.data.attendanceByDay}
          employeeGrowth={summaryQuery.data.employeeGrowth}
          employeesByDepartment={summaryQuery.data.employeesByDepartment}
          payrollByMonth={summaryQuery.data.payrollByMonth}
          todayLateEmployeeRows={summaryQuery.data.todayLateEmployeeRows ?? []}
          todayShiftAbsences={summaryQuery.data.todayShiftAbsences}
          stats={{
            totalEmployees: summaryQuery.data.totalEmployees,
            activeEmployees: summaryQuery.data.activeEmployees,
            todayLateEmployees: summaryQuery.data.todayLateEmployees,
            monthlyPayroll: summaryQuery.data.monthlyPayroll,
            overtimeHours: summaryQuery.data.overtimeHours,
          }}
        />
      )}
    </div>
  );
}

// ── Content (separated so filters stay visible while loading) ───────────────
function DashboardContent({
  stats,
  payrollByMonth,
  employeesByDepartment,
  attendanceByDay,
  employeeGrowth,
  todayShiftAbsences,
  todayLateEmployeeRows,
}: {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    todayLateEmployees: number;
    monthlyPayroll: number;
    overtimeHours: number;
  };
  payrollByMonth: Array<{ month: string; amount: number }>;
  employeesByDepartment: Array<{ department: string; total: number }>;
  attendanceByDay: Array<{ day: string; present: number; late: number }>;
  employeeGrowth: Array<{ month: string; total: number }>;
  todayLateEmployeeRows: TodayLateEmployeeRow[];
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
}) {
  const statCards: StatCard[] = [
    {
      label: "Tổng nhân viên",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Đang làm việc",
      value: stats.activeEmployees,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Đi trễ hôm nay",
      value: stats.todayLateEmployees,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Lương kỳ lọc",
      value: vndFmt.format(stats.monthlyPayroll),
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-orange-50",
    },
    {
      label: "Giờ tăng ca",
      value: `${stats.overtimeHours}h`,
      icon: BarChart3,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <>
      {/* ── Stat cards ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              key={card.label}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}
                >
                  <Icon className={card.color} size={20} />
                </div>
                <TrendingUp className="text-muted-foreground/40" size={14} />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold tabular-nums text-card-foreground">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AbsentEmployeesCard data={todayShiftAbsences} />
        <LateEmployeesCard rows={todayLateEmployeeRows} />
      </section>

      {/* ── Charts row 1 ── */}
      <section className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          subtitle="Tổng quỹ lương theo từng tháng"
          title="Biểu đồ lương"
        >
          {payrollByMonth.length === 0 ? (
            <EmptyChart label="Chưa có dữ liệu lương trong khoảng thời gian này" />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={payrollByMonth}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => shortVndFmt.format(v)}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  content={<ChartTooltip money />}
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                />
                <Bar
                  dataKey="amount"
                  fill="url(#barGrad)"
                  name="Quỹ lương"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard subtitle="Phân bổ nhân viên theo phòng ban" title="Phòng ban">
          {employeesByDepartment.length === 0 ? (
            <EmptyChart label="Chưa có dữ liệu phòng ban" />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="45%"
                  data={employeesByDepartment}
                  dataKey="total"
                  innerRadius={52}
                  nameKey="department"
                  outerRadius={80}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {employeesByDepartment.map((_, index) => (
                    <Cell
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                      key={index}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [value, name]}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* ── Charts row 2 ── */}
      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          subtitle="Số nhân viên có mặt và đi trễ theo ngày"
          title="Biểu đồ chấm công"
        >
          {attendanceByDay.length === 0 ? (
            <EmptyChart label="Chưa có dữ liệu chấm công trong khoảng thời gian này" />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={attendanceByDay}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="presentGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                />
                <Area
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  dataKey="present"
                  dot={false}
                  fill="url(#presentGrad)"
                  name="Có mặt"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  dataKey="late"
                  dot={false}
                  fill="url(#lateGrad)"
                  name="Đi trễ"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  type="monotone"
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          subtitle="Tổng số nhân viên qua các tháng"
          title="Tăng trưởng nhân viên"
        >
          {employeeGrowth.length === 0 ? (
            <EmptyChart label="Chưa có dữ liệu tăng trưởng" />
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={employeeGrowth}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="growthGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                />
                <Area
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#0f766e" }}
                  dataKey="total"
                  dot={false}
                  fill="url(#growthGrad)"
                  name="Nhân viên"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>
    </>
  );
}
