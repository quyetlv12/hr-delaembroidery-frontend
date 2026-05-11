import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, DollarSign, UserCheck, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartPanel } from "@/components/charts/ChartPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";

import { getDashboardSummary } from "./dashboard.service";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  if (summaryQuery.isLoading) {
    return <LoadingState label="Đang tải tổng quan..." />;
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return <ErrorState message="Không kết nối được API tổng quan." />;
  }

  const summary = summaryQuery.data;
  const cards = [
    { label: "Tổng nhân viên", value: summary.totalEmployees, icon: Users },
    { label: "Đang làm", value: summary.activeEmployees, icon: UserCheck },
    { label: "Đi trễ hôm nay", value: summary.todayLateEmployees, icon: Clock },
    { label: "Lương tháng", value: currencyFormatter.format(summary.monthlyPayroll), icon: DollarSign },
    { label: "Giờ tăng ca", value: summary.overtimeHours, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description="Tổng quan số lượng nhân viên, chấm công, bảng lương và phân bổ phòng ban."
        title="Tổng quan"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="rounded-md border border-border bg-card p-4" key={card.label}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <Icon className="text-primary" size={20} />
              </div>
              <div className="mt-3 text-2xl font-semibold text-card-foreground">{card.value}</div>
            </article>
          );
        })}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Biểu đồ lương">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={summary.payrollByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Biểu đồ chấm công">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={summary.attendanceByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line dataKey="present" stroke="var(--primary)" strokeWidth={2} />
              <Line dataKey="late" stroke="var(--accent)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Biểu đồ phòng ban">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                data={summary.employeesByDepartment}
                dataKey="total"
                fill="var(--primary)"
                nameKey="department"
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Tăng trưởng nhân viên">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={summary.employeeGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="total" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>
    </div>
  );
}
