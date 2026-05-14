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
import {
  payrollEmployeeViewColumns,
  type PayrollEmployeeViewColumn,
} from "@/features/employee-view-settings/employee-view-settings.types";
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
  const visibleColumns = useMemo(
    () => payrollQuery.data?.visibleColumns ?? [...payrollEmployeeViewColumns],
    [payrollQuery.data?.visibleColumns],
  );
  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
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
      workDay: filteredRecords.reduce((total, record) => total + Number(record.workDay ?? 0), 0),
      netSalary: filteredRecords.reduce((total, record) => total + Number(record.netSalary ?? 0), 0),
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
          {visibleColumnSet.has("workDay") ? (
            <Metric icon={CalendarDays} label="Ngày công" value={formatNumber(filteredTotals.workDay)} />
          ) : null}
          {visibleColumnSet.has("netSalary") ? (
            <Metric icon={Banknote} label="Thực nhận" value={currencyFormatter.format(filteredTotals.netSalary)} />
          ) : null}
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
        <PayrollExcelTable records={filteredRecords} visibleColumns={visibleColumns} />
      )}
    </div>
  );
}

function PayrollExcelTable({
  records,
  visibleColumns,
}: {
  records: SalaryRecord[];
  visibleColumns: PayrollEmployeeViewColumn[];
}) {
  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const show = (column: PayrollEmployeeViewColumn) => visibleColumnSet.has(column);
  const visibleColumnCount = payrollEmployeeViewColumns.filter((column) => visibleColumnSet.has(column)).length;
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
          Các số tiền được tính theo danh mục và công thức do admin cài đặt trong màn hình cài đặt chấm công.
        </p>
      </div>

      <div className="scrollbar-none max-h-[72vh] overflow-auto">
        <table
          className="table-fixed border-collapse text-left text-[12px]"
          style={{ minWidth: `${Math.max(760, visibleColumnCount * 112)}px` }}
        >
          <thead className="sticky top-0 z-20 text-card-foreground">
            <tr className="bg-sky-50 text-center text-[12px] font-semibold uppercase text-sky-950">
              {renderGroupHeader("Thông tin nhân viên", [
                "employeeCode",
                "employeeName",
                "departmentName",
                "positionName",
                "insuranceSalary",
                "configuredSalary",
              ], visibleColumnSet)}
              {renderGroupHeader("Lương ngày được hưởng", [
                "fixedDailySalary",
                "responsibilityAllowance",
                "mealAllowance",
                "phoneAllowance",
                "kpiAllowance",
                "dailyTotal",
              ], visibleColumnSet)}
              {renderGroupHeader("Ngày công", ["workDay", "overtimeWorkDay", "totalWorkDay"], visibleColumnSet)}
              {renderGroupHeader("Lương được hưởng", ["earnedSalary", "overtimeTotal", "grossSalary"], visibleColumnSet)}
              {renderGroupHeader("Bảng tính BHXH", ["employerInsuranceTotal", "insuranceTotal"], visibleColumnSet)}
              {renderGroupHeader("Các khoản giảm trừ", ["taxTotal", "advanceTotal", "deductionTotal"], visibleColumnSet)}
              {show("netSalary") ? <GroupHeader>Thực nhận</GroupHeader> : null}
              {show("dependentNote") ? <GroupHeader>Ghi chú NPT</GroupHeader> : null}
              {show("email") ? <GroupHeader>Email</GroupHeader> : null}
              {show("status") ? <GroupHeader>Trạng thái</GroupHeader> : null}
            </tr>
            <tr className="bg-sky-50 text-[12px] font-semibold text-sky-950">
              {show("employeeCode") ? <HeaderCell className="w-20">Mã NV</HeaderCell> : null}
              {show("employeeName") ? <HeaderCell className="w-48">Họ và tên</HeaderCell> : null}
              {show("departmentName") ? <HeaderCell className="w-36">Phòng ban</HeaderCell> : null}
              {show("positionName") ? <HeaderCell className="w-32">Chức vụ</HeaderCell> : null}
              {show("insuranceSalary") ? <HeaderCell className="w-32 text-right">Lương BHXH</HeaderCell> : null}
              {show("configuredSalary") ? <HeaderCell className="w-32 text-right">Thực hưởng</HeaderCell> : null}
              {show("fixedDailySalary") ? <HeaderCell className="w-32 text-right">Lương cố định</HeaderCell> : null}
              {show("responsibilityAllowance") ? <HeaderCell className="w-28 text-right">Trách nhiệm</HeaderCell> : null}
              {show("mealAllowance") ? <HeaderCell className="w-24 text-right">Ăn ca</HeaderCell> : null}
              {show("phoneAllowance") ? <HeaderCell className="w-28 text-right">Điện thoại</HeaderCell> : null}
              {show("kpiAllowance") ? <HeaderCell className="w-32 text-right">KPI</HeaderCell> : null}
              {show("dailyTotal") ? <HeaderCell className="w-32 text-right">Tổng cộng</HeaderCell> : null}
              {show("workDay") ? <HeaderCell className="w-28 text-right">Số công</HeaderCell> : null}
              {show("overtimeWorkDay") ? <HeaderCell className="w-24 text-right">Công tăng ca</HeaderCell> : null}
              {show("totalWorkDay") ? <HeaderCell className="w-28 text-right">Tổng công</HeaderCell> : null}
              {show("earnedSalary") ? <HeaderCell className="w-36 text-right">Lương trong tháng</HeaderCell> : null}
              {show("overtimeTotal") ? <HeaderCell className="w-28 text-right">Lương tăng ca</HeaderCell> : null}
              {show("grossSalary") ? <HeaderCell className="w-36 text-right">Tổng lương</HeaderCell> : null}
              {show("employerInsuranceTotal") ? <HeaderCell className="w-32 text-right">BHXH công ty</HeaderCell> : null}
              {show("insuranceTotal") ? <HeaderCell className="w-32 text-right">BHXH NLĐ</HeaderCell> : null}
              {show("taxTotal") ? <HeaderCell className="w-28 text-right">Thuế TNCN</HeaderCell> : null}
              {show("advanceTotal") ? <HeaderCell className="w-28 text-right">Tạm ứng</HeaderCell> : null}
              {show("deductionTotal") ? <HeaderCell className="w-40 text-right">Tổng giảm trừ</HeaderCell> : null}
              {show("netSalary") ? <HeaderCell className="w-36 text-right">Thực nhận</HeaderCell> : null}
              {show("dependentNote") ? <HeaderCell className="w-32">Ghi chú NPT</HeaderCell> : null}
              {show("email") ? <HeaderCell className="w-56">Email</HeaderCell> : null}
              {show("status") ? <HeaderCell className="w-24">Trạng thái</HeaderCell> : null}
            </tr>
            <tr className="bg-amber-50 text-center text-[11px] italic text-muted-foreground">
              {payrollFormulaLabels.filter(([column]) => show(column)).map(([column, label]) => (
                <th className="border border-border px-2 py-2 font-medium" key={column}>
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
                visibleColumnCount={visibleColumnCount}
                visibleColumns={visibleColumns}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-amber-50 font-semibold text-card-foreground">
            <tr>
              {show("employeeCode") ? <FooterTextCell>TỔNG CỘNG</FooterTextCell> : null}
              {show("employeeName") ? <FooterTextCell /> : null}
              {show("departmentName") ? <FooterTextCell /> : null}
              {show("positionName") ? <FooterTextCell /> : null}
              {show("insuranceSalary") ? <MoneyTableCell value={totals.insuranceSalary} /> : null}
              {show("configuredSalary") ? <MoneyTableCell value={totals.configuredSalary} /> : null}
              {show("fixedDailySalary") ? <FooterTextCell /> : null}
              {show("responsibilityAllowance") ? <FooterTextCell /> : null}
              {show("mealAllowance") ? <FooterTextCell /> : null}
              {show("phoneAllowance") ? <FooterTextCell /> : null}
              {show("kpiAllowance") ? <FooterTextCell /> : null}
              {show("dailyTotal") ? <FooterTextCell /> : null}
              {show("workDay") ? <NumberTableCell value={totals.workDay} /> : null}
              {show("overtimeWorkDay") ? <NumberTableCell value={totals.overtimeWorkDay} /> : null}
              {show("totalWorkDay") ? <NumberTableCell value={totals.totalWorkDay} /> : null}
              {show("earnedSalary") ? <MoneyTableCell tone="base" value={totals.earnedSalary} /> : null}
              {show("overtimeTotal") ? <MoneyTableCell sign="plus" tone="positive" value={totals.overtimeTotal} /> : null}
              {show("grossSalary") ? <MoneyTableCell tone="base" value={totals.grossSalary} /> : null}
              {show("employerInsuranceTotal") ? (
                <MoneyTableCell sign="minus" tone="negative" value={totals.employerInsuranceTotal} />
              ) : null}
              {show("insuranceTotal") ? <MoneyTableCell sign="minus" tone="negative" value={totals.insuranceTotal} /> : null}
              {show("taxTotal") ? <MoneyTableCell sign="minus" tone="negative" value={totals.taxTotal} /> : null}
              {show("advanceTotal") ? <MoneyTableCell sign="minus" tone="negative" value={totals.advanceTotal} /> : null}
              {show("deductionTotal") ? <MoneyTableCell sign="minus" tone="negative" value={totals.deductionTotal} /> : null}
              {show("netSalary") ? (
                <MoneyTableCell className="bg-yellow-200 text-slate-950" tone="net" value={totals.netSalary} />
              ) : null}
              {show("dependentNote") ? <FooterTextCell /> : null}
              {show("email") ? <FooterTextCell /> : null}
              {show("status") ? <FooterTextCell /> : null}
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
  visibleColumnCount,
  visibleColumns,
}: {
  groupIndex: number;
  groupName: string;
  records: SalaryRecord[];
  visibleColumnCount: number;
  visibleColumns: PayrollEmployeeViewColumn[];
}) {
  const visibleColumnSet = new Set(visibleColumns);
  const show = (column: PayrollEmployeeViewColumn) => visibleColumnSet.has(column);

  return (
    <>
      <tr className="bg-slate-100 text-sm font-semibold text-card-foreground">
        <td className="border border-border px-3 py-2" colSpan={visibleColumnCount}>
          {toRoman(groupIndex + 1)}. Bộ phận {groupName}
        </td>
      </tr>
      {records.map((record) => (
        <tr className="bg-card hover:bg-muted/40" key={record.id}>
          {show("employeeCode") ? <TextTableCell>{record.employeeCode}</TextTableCell> : null}
          {show("employeeName") ? <TextTableCell className="font-medium">{record.employeeName}</TextTableCell> : null}
          {show("departmentName") ? <TextTableCell>{record.departmentName || "-"}</TextTableCell> : null}
          {show("positionName") ? <TextTableCell>{record.positionName || "-"}</TextTableCell> : null}
          {show("insuranceSalary") ? <MoneyTableCell value={record.insuranceSalary} /> : null}
          {show("configuredSalary") ? <MoneyTableCell value={record.configuredSalary} /> : null}
          {show("fixedDailySalary") ? <MoneyTableCell value={record.fixedDailySalary} /> : null}
          {show("responsibilityAllowance") ? (
            <MoneyTableCell sign="plus" tone="positive" value={record.responsibilityAllowance} />
          ) : null}
          {show("mealAllowance") ? <MoneyTableCell sign="plus" tone="positive" value={record.mealAllowance} /> : null}
          {show("phoneAllowance") ? <MoneyTableCell sign="plus" tone="positive" value={record.phoneAllowance} /> : null}
          {show("kpiAllowance") ? <MoneyTableCell sign="plus" tone="positive" value={record.kpiAllowance} /> : null}
          {show("dailyTotal") ? <MoneyTableCell tone="base" value={record.dailyTotal} /> : null}
          {show("workDay") ? <NumberTableCell value={record.workDay} /> : null}
          {show("overtimeWorkDay") ? <NumberTableCell value={record.overtimeWorkDay} /> : null}
          {show("totalWorkDay") ? <NumberTableCell value={record.totalWorkDay} /> : null}
          {show("earnedSalary") ? <MoneyTableCell tone="base" value={record.earnedSalary} /> : null}
          {show("overtimeTotal") ? <MoneyTableCell sign="plus" tone="positive" value={record.overtimeTotal} /> : null}
          {show("grossSalary") ? <MoneyTableCell tone="base" value={record.grossSalary} /> : null}
          {show("employerInsuranceTotal") ? (
            <MoneyTableCell sign="minus" tone="negative" value={record.employerInsuranceTotal} />
          ) : null}
          {show("insuranceTotal") ? <MoneyTableCell sign="minus" tone="negative" value={record.insuranceTotal} /> : null}
          {show("taxTotal") ? <MoneyTableCell sign="minus" tone="negative" value={record.taxTotal} /> : null}
          {show("advanceTotal") ? <MoneyTableCell sign="minus" tone="negative" value={record.advanceTotal} /> : null}
          {show("deductionTotal") ? <MoneyTableCell sign="minus" tone="negative" value={record.deductionTotal} /> : null}
          {show("netSalary") ? (
            <MoneyTableCell className="bg-yellow-100 text-slate-950" tone="net" value={record.netSalary} />
          ) : null}
          {show("dependentNote") ? <TextTableCell>{record.dependentNote}</TextTableCell> : null}
          {show("email") ? <TextTableCell>{record.email}</TextTableCell> : null}
          {show("status") ? <TextTableCell>{payrollStatusLabel[record.status]}</TextTableCell> : null}
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

function renderGroupHeader(
  label: string,
  columns: PayrollEmployeeViewColumn[],
  visibleColumnSet: Set<PayrollEmployeeViewColumn>,
) {
  const colSpan = columns.filter((column) => visibleColumnSet.has(column)).length;
  return colSpan > 0 ? (
    <GroupHeader colSpan={colSpan} key={label}>
      {label}
    </GroupHeader>
  ) : null;
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

function FooterTextCell({ children }: { children?: ReactNode }) {
  return <td className="border border-border px-3 py-2">{children}</td>;
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

const payrollFormulaLabels: Array<[PayrollEmployeeViewColumn, string]> = [
  ["employeeCode", "(1)"],
  ["employeeName", "(2)"],
  ["departmentName", "(3)"],
  ["positionName", "(4)"],
  ["insuranceSalary", "(5)"],
  ["configuredSalary", "(6)"],
  ["fixedDailySalary", "(7)=(5)/công chuẩn"],
  ["responsibilityAllowance", "(8)"],
  ["mealAllowance", "(9)"],
  ["phoneAllowance", "(10)"],
  ["kpiAllowance", "(11)"],
  ["dailyTotal", "(12)=cộng(7:11)"],
  ["workDay", "(13)"],
  ["overtimeWorkDay", "(14)"],
  ["totalWorkDay", "(15)=(13)+(14)"],
  ["earnedSalary", "(16)=(12)*(13)"],
  ["overtimeTotal", "(17)"],
  ["grossSalary", "(18)=(16)+(17)"],
  ["employerInsuranceTotal", "(19)"],
  ["insuranceTotal", "(20)"],
  ["taxTotal", "(21)"],
  ["advanceTotal", "(22)"],
  ["deductionTotal", "(23)=(20)+(21)+(22)"],
  ["netSalary", "(24)=(18)-(23)"],
  ["dependentNote", "(25)"],
  ["email", "(26)"],
  ["status", "(27)"],
];
