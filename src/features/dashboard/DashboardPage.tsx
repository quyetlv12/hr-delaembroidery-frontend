import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Clock,
  DollarSign,
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
import { getEmployees } from "@/features/employees/employee.service";

import { DashboardFilters } from "./components/DashboardFilters";
import { getDashboardSummary } from "./dashboard.service";

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
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: toDateString(from),
    to: toDateString(to),
  };
}

function toDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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
  const visibleRows = data.rows.slice(0, 8);
  const hiddenCount = Math.max(0, data.total - visibleRows.length);

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
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {visibleRows.map((employee) => (
            <div
              className="flex min-w-0 items-center gap-3 rounded-lg border border-amber-200 bg-background px-3 py-2"
              key={employee.employeeId}
            >
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
          ))}
          {hiddenCount > 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-amber-300 bg-background/70 px-3 py-2 text-sm font-semibold text-amber-700">
              +{hiddenCount} người khác
            </div>
          ) : null}
        </div>
      )}
    </section>
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

      <AbsentEmployeesCard data={todayShiftAbsences} />

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
