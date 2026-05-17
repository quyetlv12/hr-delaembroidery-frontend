import { Banknote, CalendarDays, Users, type LucideIcon } from "lucide-react";

import type { PayrollEmployeeViewColumn } from "@/features/employee-view-settings/employee-view-settings.types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function PayrollSummaryMetrics({
  employeeCount,
  netSalary,
  visibleColumnSet,
  workDay,
}: {
  employeeCount: number;
  netSalary: number;
  visibleColumnSet: Set<PayrollEmployeeViewColumn>;
  workDay: number;
}) {
  return (
    <div className="grid border-t border-border md:grid-cols-3">
      <Metric icon={Users} label="Nhân viên" value={employeeCount} />
      {visibleColumnSet.has("workDay") ? <Metric icon={CalendarDays} label="Ngày công" value={formatNumber(workDay)} /> : null}
      {visibleColumnSet.has("netSalary") ? <Metric icon={Banknote} label="Thực nhận" value={currencyFormatter.format(netSalary)} /> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-r border-border px-4 py-5 last:border-r-0 md:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}
