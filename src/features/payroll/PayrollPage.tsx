import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CalendarDays, Calculator, Download, Filter, Lock, Search, Users, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { RequirePermission } from "@/components/common/RequirePermission";
import { AppMonthPicker } from "@/components/form/AppMonthPicker";
import { permissions } from "@/constants/permissions";
import { confirmLockPayroll } from "@/lib/confirm";
import { showApiError, showSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { calculatePayroll, exportPayrollTransferFile, getPayroll, lockPayroll } from "./payroll.service";
import type { SalaryRecord } from "./payroll.types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const payrollStatusLabel = {
  draft: "Nháp",
  locked: "Đã khóa",
} as const;

type PayrollStatusFilter = "all" | SalaryRecord["status"];

export function PayrollPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [periodDate, setPeriodDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayrollStatusFilter>("all");
  const month = periodDate.getMonth() + 1;
  const year = periodDate.getFullYear();
  const payrollQuery = useQuery({
    queryKey: ["payroll", month, year],
    queryFn: () => getPayroll(month, year),
  });
  const period = payrollQuery.data?.period;
  const isLocked = period?.status === "locked";
  const records = useMemo(() => payrollQuery.data?.records ?? [], [payrollQuery.data?.records]);

  const calculateMutation = useMutation({
    mutationFn: () => calculatePayroll(month, year),
    onSuccess() {
      showSuccess("Tính lương thành công");
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const lockMutation = useMutation({
    mutationFn: lockPayroll,
    onSuccess() {
      showSuccess("Khóa kỳ lương thành công");
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!period) {
        throw new Error("Chưa có kỳ lương để xuất file chuyển tiền");
      }

      return exportPayrollTransferFile(period.id);
    },
    onSuccess(fileName) {
      showSuccess(`Đã xuất file ${fileName}`);
    },
    onError(error) {
      showApiError(error);
    },
  });

  const filteredRecords = useMemo(() => {
    const searchText = normalizeSearchText(keyword);

    return records.filter((record) => {
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesKeyword =
        searchText.length === 0 ||
        normalizeSearchText(`${record.employeeCode} ${record.employeeName}`).includes(searchText);

      return matchesStatus && matchesKeyword;
    });
  }, [keyword, records, statusFilter]);
  const filteredTotals = useMemo(
    () => ({
      employeeCount: filteredRecords.length,
      workDay: filteredRecords.reduce((total, record) => total + Number(record.workDay), 0),
      netSalary: filteredRecords.reduce((total, record) => total + Number(record.netSalary), 0),
    }),
    [filteredRecords],
  );
  const hasActiveFilters = keyword.trim().length > 0 || statusFilter !== "all";

  const handleLockPayroll = async () => {
    if (!period) {
      return;
    }

    const confirmed = await confirmLockPayroll(`kỳ lương ${String(month).padStart(2, "0")}/${year}`);
    if (confirmed) {
      lockMutation.mutate(period.id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <RequirePermission permission={permissions.payrollCalculate}>
              <Button disabled={calculateMutation.isPending || isLocked} onClick={() => calculateMutation.mutate()}>
                <Calculator size={18} />
                {calculateMutation.isPending ? "Đang tính..." : "Tính lại"}
              </Button>
            </RequirePermission>
            <RequirePermission permission={permissions.bankTransferExport}>
              <Button
                disabled={!period || records.length === 0 || exportMutation.isPending}
                variant="secondary"
                onClick={() => exportMutation.mutate()}
              >
                <Download size={18} />
                {exportMutation.isPending ? "Đang xuất..." : "Xuất file chuyển tiền"}
              </Button>
            </RequirePermission>
            <RequirePermission permission={permissions.payrollLock}>
              <Button
                disabled={!period || isLocked || lockMutation.isPending}
                variant="secondary"
                onClick={handleLockPayroll}
              >
                <Lock size={18} />
                {isLocked ? "Đã khóa" : "Khóa kỳ"}
              </Button>
            </RequirePermission>
          </>
        }
        description="Kiểm tra bảng lương được tạo từ dữ liệu chấm công trước khi khóa kỳ lương."
        title="Bảng lương"
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Bộ lọc bảng lương</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lọc theo kỳ, nhân viên và trạng thái để kiểm tra trước khi khóa lương.
              </p>
            </div>
          </div>
          {period ? (
            <Badge tone={isLocked ? "neutral" : "warning"}>{payrollStatusLabel[period.status]}</Badge>
          ) : (
            <Badge tone="warning">Chưa tạo kỳ</Badge>
          )}
        </div>

        <div className="grid gap-4 px-4 py-4 md:px-5 lg:grid-cols-[220px_minmax(280px,1fr)_180px_auto]">
          <AppMonthPicker label="Kỳ lương" value={periodDate} onChange={setPeriodDate} />
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Tìm nhân viên</span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={17}
              />
              <input
                className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="Mã NV hoặc tên nhân viên"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Trạng thái</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PayrollStatusFilter)}
            >
              <option value="all">Tất cả</option>
              <option value="draft">Nháp</option>
              <option value="locked">Đã khóa</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button
              className="w-full lg:w-auto"
              disabled={!hasActiveFilters}
              variant="secondary"
              onClick={() => {
                setKeyword("");
                setStatusFilter("all");
              }}
            >
              Xóa lọc
            </Button>
          </div>
        </div>

        <div className="grid border-t border-border md:grid-cols-3">
          <Metric icon={Users} label="Nhân viên" value={filteredTotals.employeeCount} />
          <Metric icon={CalendarDays} label="Ngày công" value={formatNumber(filteredTotals.workDay)} />
          <Metric icon={Banknote} label="Thực nhận" value={currencyFormatter.format(filteredTotals.netSalary)} />
        </div>
      </section>

      {payrollQuery.isLoading ? (
        <LoadingState />
      ) : payrollQuery.isError ? (
        <ErrorState />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          description={
            records.length > 0
              ? "Thay đổi từ khóa hoặc trạng thái để xem thêm bản ghi."
              : "Nhập chấm công trước, hệ thống sẽ tự tính lương cho kỳ này."
          }
          title={records.length > 0 ? "Không có bản ghi phù hợp" : "Chưa có bản ghi lương"}
        />
      ) : (
        <PayrollExcelTable records={filteredRecords} />
      )}
    </div>
  );
}

function PayrollExcelTable({ records }: { records: SalaryRecord[] }) {
  const groupedRecords = useMemo(() => groupPayrollRecords(records), [records]);
  const totals = useMemo(
    () => ({
      configuredSalary: sumRecords(records, "configuredSalary"),
      insuranceSalary: sumRecords(records, "insuranceSalary"),
      workDay: sumRecords(records, "workDay"),
      overtimeWorkDay: sumRecords(records, "overtimeWorkDay"),
      totalWorkDay: sumRecords(records, "totalWorkDay"),
      earnedSalary: sumRecords(records, "earnedSalary"),
      overtimeTotal: sumRecords(records, "overtimeTotal"),
      grossSalary: sumRecords(records, "grossSalary"),
      employerInsuranceTotal: sumRecords(records, "employerInsuranceTotal"),
      insuranceTotal: sumRecords(records, "insuranceTotal"),
      taxTotal: sumRecords(records, "taxTotal"),
      advanceTotal: sumRecords(records, "advanceTotal"),
      deductionTotal: sumRecords(records, "deductionTotal"),
      netSalary: sumRecords(records, "netSalary"),
    }),
    [records],
  );

  return (
    <section className="w-full max-w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="text-base font-semibold text-card-foreground">Bảng tính lương theo mẫu Excel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Công thức chính: Tổng lương ngày = lương cố định + phụ cấp; lương trong tháng = tổng lương ngày x số công;
          tổng giảm trừ = BHXH NLĐ + thuế TNCN + tạm ứng; thực nhận = tổng lương - tổng giảm trừ.
        </p>
      </div>

      <div className="scrollbar-none max-h-[72vh] overflow-auto">
        <table className="min-w-[2680px] table-fixed border-collapse text-left text-[12px]">
          <thead className="sticky top-0 z-20 text-card-foreground">
            <tr className="bg-sky-50 text-center text-[12px] font-semibold uppercase text-sky-950">
              <GroupHeader colSpan={5}>Thông tin nhân viên</GroupHeader>
              <GroupHeader colSpan={6}>Lương ngày được hưởng</GroupHeader>
              <GroupHeader colSpan={3}>Ngày công</GroupHeader>
              <GroupHeader colSpan={3}>Lương được hưởng</GroupHeader>
              <GroupHeader colSpan={2}>Bảng tính BHXH</GroupHeader>
              <GroupHeader colSpan={3}>Các khoản giảm trừ</GroupHeader>
              <GroupHeader>Thực nhận</GroupHeader>
              <GroupHeader>Ghi chú NPT</GroupHeader>
              <GroupHeader>Email</GroupHeader>
            </tr>
            <tr className="bg-sky-50 text-[12px] font-semibold text-sky-950">
              <HeaderCell className="w-20">Mã NV</HeaderCell>
              <HeaderCell className="w-48">Họ và tên</HeaderCell>
              <HeaderCell className="w-32">Chức vụ</HeaderCell>
              <HeaderCell className="w-32 text-right">Lương BHXH</HeaderCell>
              <HeaderCell className="w-32 text-right">Thực hưởng</HeaderCell>
              <HeaderCell className="w-32 text-right">Lương cố định</HeaderCell>
              <HeaderCell className="w-28 text-right">Trách nhiệm</HeaderCell>
              <HeaderCell className="w-24 text-right">Ăn ca</HeaderCell>
              <HeaderCell className="w-28 text-right">Điện thoại</HeaderCell>
              <HeaderCell className="w-32 text-right">KPI</HeaderCell>
              <HeaderCell className="w-32 text-right">Tổng cộng</HeaderCell>
              <HeaderCell className="w-28 text-right">Số công</HeaderCell>
              <HeaderCell className="w-24 text-right">Công tăng ca</HeaderCell>
              <HeaderCell className="w-28 text-right">Tổng công</HeaderCell>
              <HeaderCell className="w-36 text-right">Lương trong tháng</HeaderCell>
              <HeaderCell className="w-28 text-right">Lương tăng ca</HeaderCell>
              <HeaderCell className="w-36 text-right">Tổng lương</HeaderCell>
              <HeaderCell className="w-32 text-right">BHXH công ty</HeaderCell>
              <HeaderCell className="w-32 text-right">BHXH NLĐ</HeaderCell>
              <HeaderCell className="w-28 text-right">Thuế TNCN</HeaderCell>
              <HeaderCell className="w-28 text-right">Tạm ứng</HeaderCell>
              <HeaderCell className="w-40 text-right">Tổng giảm trừ</HeaderCell>
              <HeaderCell className="w-36 text-right">Thực nhận</HeaderCell>
              <HeaderCell className="w-32">Ghi chú NPT</HeaderCell>
              <HeaderCell className="w-56">Email</HeaderCell>
            </tr>
            <tr className="bg-amber-50 text-center text-[11px] italic text-muted-foreground">
              {formulaLabels.map((label) => (
                <th className="border border-border px-2 py-2 font-medium" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRecords.map((group, groupIndex) => (
              <PayrollGroupRows
                groupIndex={groupIndex}
                groupName={group.name}
                key={group.name}
                records={group.records}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-amber-50 font-semibold text-card-foreground">
            <tr>
              <td className="border border-border px-3 py-2" colSpan={3}>
                TỔNG CỘNG
              </td>
              <MoneyTableCell value={totals.insuranceSalary} />
              <MoneyTableCell value={totals.configuredSalary} />
              <td className="border border-border px-3 py-2" colSpan={6} />
              <NumberTableCell value={totals.workDay} />
              <NumberTableCell value={totals.overtimeWorkDay} />
              <NumberTableCell value={totals.totalWorkDay} />
              <MoneyTableCell tone="base" value={totals.earnedSalary} />
              <MoneyTableCell sign="plus" tone="positive" value={totals.overtimeTotal} />
              <MoneyTableCell tone="base" value={totals.grossSalary} />
              <MoneyTableCell sign="minus" tone="negative" value={totals.employerInsuranceTotal} />
              <MoneyTableCell sign="minus" tone="negative" value={totals.insuranceTotal} />
              <MoneyTableCell sign="minus" tone="negative" value={totals.taxTotal} />
              <MoneyTableCell sign="minus" tone="negative" value={totals.advanceTotal} />
              <MoneyTableCell sign="minus" tone="negative" value={totals.deductionTotal} />
              <MoneyTableCell className="bg-yellow-200 text-slate-950" tone="net" value={totals.netSalary} />
              <td className="border border-border px-3 py-2" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function PayrollGroupRows({
  groupIndex,
  groupName,
  records,
}: {
  groupIndex: number;
  groupName: string;
  records: SalaryRecord[];
}) {
  return (
    <>
      <tr className="bg-slate-100 text-sm font-semibold text-card-foreground">
        <td className="border border-border px-3 py-2" colSpan={25}>
          {toRoman(groupIndex + 1)}. Bộ phận {groupName}
        </td>
      </tr>
      {records.map((record) => (
        <tr className="bg-card hover:bg-muted/40" key={record.id}>
          <TextTableCell>{record.employeeCode}</TextTableCell>
          <TextTableCell className="font-medium">{record.employeeName}</TextTableCell>
          <TextTableCell>{record.positionName || "-"}</TextTableCell>
          <MoneyTableCell value={record.insuranceSalary} />
          <MoneyTableCell value={record.configuredSalary} />
          <MoneyTableCell value={record.fixedDailySalary} />
          <MoneyTableCell sign="plus" tone="positive" value={record.responsibilityAllowance} />
          <MoneyTableCell sign="plus" tone="positive" value={record.mealAllowance} />
          <MoneyTableCell sign="plus" tone="positive" value={record.phoneAllowance} />
          <MoneyTableCell sign="plus" tone="positive" value={record.kpiAllowance} />
          <MoneyTableCell tone="base" value={record.dailyTotal} />
          <NumberTableCell value={record.workDay} />
          <NumberTableCell value={record.overtimeWorkDay} />
          <NumberTableCell value={record.totalWorkDay} />
          <MoneyTableCell tone="base" value={record.earnedSalary} />
          <MoneyTableCell sign="plus" tone="positive" value={record.overtimeTotal} />
          <MoneyTableCell tone="base" value={record.grossSalary} />
          <MoneyTableCell sign="minus" tone="negative" value={record.employerInsuranceTotal} />
          <MoneyTableCell sign="minus" tone="negative" value={record.insuranceTotal} />
          <MoneyTableCell sign="minus" tone="negative" value={record.taxTotal} />
          <MoneyTableCell sign="minus" tone="negative" value={record.advanceTotal} />
          <MoneyTableCell sign="minus" tone="negative" value={record.deductionTotal} />
          <MoneyTableCell className="bg-yellow-100 text-slate-950" tone="net" value={record.netSalary} />
          <TextTableCell>{getDependentNote(record)}</TextTableCell>
          <TextTableCell>{record.email}</TextTableCell>
        </tr>
      ))}
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-card-foreground">{value}</div>
      </div>
    </div>
  );
}

function GroupHeader({ children, colSpan = 1 }: { children: ReactNode; colSpan?: number }) {
  return (
    <th className="border border-border px-3 py-3 text-center align-middle" colSpan={colSpan}>
      {children}
    </th>
  );
}

function HeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("border border-border px-3 py-3 align-middle", className)}>
      {children}
    </th>
  );
}

function TextTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={cn("truncate border border-border px-3 py-2.5 text-card-foreground", className)}
      title={String(children)}
    >
      {children}
    </td>
  );
}

function NumberTableCell({ value }: { value: number }) {
  return (
    <td className="border border-border px-3 py-2.5 text-right tabular-nums text-card-foreground">
      {formatNumber(value)}
    </td>
  );
}

function MoneyTableCell({
  value,
  tone = "neutral",
  sign = "none",
  className,
}: {
  value: number;
  tone?: "neutral" | "base" | "positive" | "negative" | "net";
  sign?: "none" | "plus" | "minus";
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border border-border px-3 py-2.5 text-right font-semibold tabular-nums",
        getMoneyToneClass(tone, value),
        className,
      )}
    >
      {formatMoney(value, sign)}
    </td>
  );
}

function getMoneyToneClass(tone: "neutral" | "base" | "positive" | "negative" | "net", value: number) {
  if (value === 0) {
    return "bg-muted/40 text-muted-foreground";
  }

  if (tone === "base") {
    return "bg-sky-50 text-sky-700";
  }

  if (tone === "positive") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (tone === "negative") {
    return "bg-rose-50 text-rose-700";
  }

  if (tone === "net") {
    return "bg-teal-50 text-primary";
  }

  return "text-card-foreground";
}

function formatMoney(value: number, sign: "none" | "plus" | "minus" = "none") {
  if (value === 0 || sign === "none") {
    return currencyFormatter.format(value);
  }

  const prefix = sign === "plus" ? "+" : "-";
  return `${prefix}${currencyFormatter.format(Math.abs(value))}`;
}

function groupPayrollRecords(records: SalaryRecord[]) {
  const groups = new Map<string, SalaryRecord[]>();

  for (const record of records) {
    const groupName = record.departmentName || "Chưa phân bộ phận";
    groups.set(groupName, [...(groups.get(groupName) ?? []), record]);
  }

  return Array.from(groups, ([name, groupRecords]) => ({
    name,
    records: groupRecords,
  }));
}

function toRoman(value: number) {
  const romanNumbers = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return romanNumbers[value - 1] ?? String(value);
}

function sumRecords(records: SalaryRecord[], key: keyof SalaryRecord) {
  return records.reduce((total, record) => total + Number(record[key] ?? 0), 0);
}

function getDependentNote(record: SalaryRecord) {
  return record.details.find((detail) => detail.label.toLocaleLowerCase("vi-VN").includes("phụ thuộc"))?.label ?? "";
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

const formulaLabels = [
  "(1)",
  "(2)",
  "(3)",
  "(4)",
  "(5)",
  "(6)=(4)/công chuẩn",
  "(7)",
  "(8)",
  "(9)",
  "(10)",
  "(11)=cộng(6:10)",
  "(12)",
  "(13)",
  "(14)=(12)+(13)",
  "(15)=(11)*(12)",
  "(16)",
  "(17)=(15)+(16)",
  "(18)",
  "(19)",
  "(20)",
  "(21)",
  "(22)=(19)+(20)+(21)",
  "(23)=(17)-(22)",
  "(24)",
  "(25)",
];
