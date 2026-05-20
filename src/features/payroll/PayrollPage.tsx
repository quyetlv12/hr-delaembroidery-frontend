import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  Download,
  Filter,
  History,
  Lock,
  LockOpen,
  RotateCcw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { RequirePermission } from "@/components/common/RequirePermission";
import { AppMonthPicker } from "@/components/form/AppMonthPicker";
import { permissions } from "@/constants/permissions";
import { usePermission } from "@/hooks/use-permission";
import { confirmLockPayroll, confirmUnlockPayroll } from "@/lib/confirm";
import { showApiError, showSuccess } from "@/lib/toast";

import {
  filterPayrollDisplayColumns,
  payrollDisplayColumns,
} from "./payroll-column-metadata";
import {
  calculatePayroll,
  exportPayrollTransferFile,
  getPayroll,
  getPayrollFormulaSetting,
  getPayrollFormulaTemplates,
  lockPayroll,
  restorePayrollBonuses,
  unlockPayroll,
  updatePayrollRecord,
} from "./payroll.service";
import { FormulaPickerDialog } from "./components/FormulaPickerDialog";
import { PayrollExcelTable } from "./components/PayrollExcelTable";
import { PayrollRecordHistoryDialog } from "./components/PayrollRecordHistoryDialog";
import { PayrollSummaryMetrics } from "./components/PayrollSummaryMetrics";
import { PayrollViewSettingsPanel } from "./components/PayrollViewSettingsPanel";
import type {
  PayrollFormulaSetting,
  PayrollRecordEditableField,
  SalaryRecord,
} from "./payroll.types";

const payrollStatusLabel = {
  draft: "Nháp",
  locked: "Đã khóa",
} as const;

type PayrollStatusFilter = "all" | SalaryRecord["status"];

export function PayrollPage() {
  const queryClient = useQueryClient();
  const canCalculatePayroll = usePermission(permissions.payrollCalculate);
  const now = new Date();
  const [periodDate, setPeriodDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayrollStatusFilter>("all");
  const [formulaPickerOpen, setFormulaPickerOpen] = useState(false);
  const [recordHistoryOpen, setRecordHistoryOpen] = useState(false);
  const [selectedFormulaSource, setSelectedFormulaSource] = useState("current");
  const month = periodDate.getMonth() + 1;
  const year = periodDate.getFullYear();
  const payrollQuery = useQuery({
    queryKey: ["payroll", month, year],
    queryFn: () => getPayroll(month, year),
  });
  const formulaQuery = useQuery({
    queryKey: ["payroll-formula-settings"],
    queryFn: getPayrollFormulaSetting,
  });
  const formulaTemplatesQuery = useQuery({
    queryKey: ["payroll-formula-templates"],
    queryFn: getPayrollFormulaTemplates,
    enabled: canCalculatePayroll,
  });
  const period = payrollQuery.data?.period;
  const visibleColumns = useMemo(
    () =>
      filterPayrollDisplayColumns(
        payrollQuery.data?.visibleColumns ?? [...payrollDisplayColumns],
      ),
    [payrollQuery.data?.visibleColumns],
  );
  const visibleColumnSet = useMemo(
    () => new Set(visibleColumns),
    [visibleColumns],
  );
  const isLocked = period?.status === "locked";
  const records = useMemo(
    () => payrollQuery.data?.records ?? [],
    [payrollQuery.data?.records],
  );

  const calculateMutation = useMutation({
    mutationFn: (formulaSetting?: PayrollFormulaSetting) =>
      calculatePayroll(month, year, formulaSetting),
    onSuccess(payroll) {
      queryClient.setQueryData(
        [
          "payroll",
          payroll.period?.month ?? month,
          payroll.period?.year ?? year,
        ],
        payroll,
      );
      setFormulaPickerOpen(false);
      showSuccess("Tính lương thành công");
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const restoreBonusesMutation = useMutation({
    mutationFn: () => restorePayrollBonuses(month, year),
    onSuccess(payroll) {
      queryClient.setQueryData(
        [
          "payroll",
          payroll.period?.month ?? month,
          payroll.period?.year ?? year,
        ],
        payroll,
      );
      showSuccess("Đã khôi phục thưởng theo kỳ");
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const periodStatusMutation = useMutation({
    mutationFn: async (action: "lock" | "unlock") => {
      if (action === "unlock") {
        if (!period) {
          throw new Error("Chưa có kỳ lương để mở khóa");
        }

        return unlockPayroll(period.id);
      }

      const payroll = period
        ? payrollQuery.data
        : await calculatePayroll(month, year);
      const targetPeriod = payroll?.period;
      if (!targetPeriod) {
        throw new Error("Chưa có kỳ lương để khóa");
      }
      if ((payroll?.records ?? []).length === 0) {
        throw new Error(
          "Chưa có dữ liệu lương để khóa. Vui lòng nhập chấm công hoặc kiểm tra lại kỳ lương.",
        );
      }

      return lockPayroll(targetPeriod.id);
    },
    onSuccess(payroll, action) {
      queryClient.setQueryData(
        [
          "payroll",
          payroll.period?.month ?? month,
          payroll.period?.year ?? year,
        ],
        payroll,
      );
      showSuccess(
        action === "unlock"
          ? "Mở khóa kỳ lương thành công"
          : "Khóa kỳ lương thành công",
      );
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
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

  const updateRecordMutation = useMutation({
    mutationFn: ({
      recordId,
      field,
      value,
    }: {
      recordId: string;
      field: PayrollRecordEditableField;
      value: number;
    }) => updatePayrollRecord(recordId, { [field]: value }),
    onSuccess(payroll) {
      queryClient.setQueryData(
        [
          "payroll",
          payroll.period?.month ?? month,
          payroll.period?.year ?? year,
        ],
        payroll,
      );
      showSuccess("Đã cập nhật bảng lương");
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({
        queryKey: ["payroll-record-history", payroll.period?.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const filteredRecords = useMemo(() => {
    const searchText = normalizeSearchText(keyword);

    return records.filter((record) => {
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      const matchesKeyword =
        searchText.length === 0 ||
        normalizeSearchText(
          `${record.employeeCode} ${record.employeeName}`,
        ).includes(searchText);

      return matchesStatus && matchesKeyword;
    });
  }, [keyword, records, statusFilter]);
  const filteredTotals = useMemo(
    () => ({
      employeeCount: filteredRecords.length,
      workDay: filteredRecords.reduce(
        (total, record) => total + Number(record.workDay ?? 0),
        0,
      ),
      netSalary: filteredRecords.reduce(
        (total, record) => total + Number(record.netSalary ?? 0),
        0,
      ),
    }),
    [filteredRecords],
  );
  const hasActiveFilters = keyword.trim().length > 0 || statusFilter !== "all";

  const handleLockPayroll = async () => {
    const periodLabel = `kỳ lương ${String(month).padStart(2, "0")}/${year}`;
    const action = isLocked ? "unlock" : "lock";
    const confirmed = isLocked
      ? await confirmUnlockPayroll(periodLabel)
      : await confirmLockPayroll(periodLabel);
    if (confirmed) {
      periodStatusMutation.mutate(action);
    }
  };
  const handleCalculateWithFormula = () => {
    const selectedTemplate = formulaTemplatesQuery.data?.find(
      (template) => template.id === selectedFormulaSource,
    );
    const selectedFormula = selectedTemplate?.setting ?? formulaQuery.data;
    if (!selectedFormula) {
      showApiError(new Error("Chưa tải được công thức tính lương"));
      return;
    }

    calculateMutation.mutate(selectedFormula);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <RequirePermission permission={permissions.payrollCalculate}>
              <Button
                disabled={calculateMutation.isPending || isLocked}
                onClick={() => setFormulaPickerOpen(true)}
              >
                <Calculator size={18} />
                {calculateMutation.isPending ? "Đang tính..." : "Tính lại"}
              </Button>
            </RequirePermission>
            <RequirePermission permission={permissions.payrollCalculate}>
              <Button
                disabled={restoreBonusesMutation.isPending || isLocked}
                variant="secondary"
                onClick={() => restoreBonusesMutation.mutate()}
              >
                <RotateCcw size={18} />
                {restoreBonusesMutation.isPending ? "Đang khôi phục..." : "Khôi phục thưởng"}
              </Button>
            </RequirePermission>
            <RequirePermission permission={permissions.payrollRead}>
              <Button
                disabled={!period}
                variant="secondary"
                onClick={() => setRecordHistoryOpen(true)}
              >
                <History size={18} />
                Lịch sử sửa
              </Button>
            </RequirePermission>
            <RequirePermission permission={permissions.bankTransferExport}>
              <Button
                disabled={
                  !period || records.length === 0 || exportMutation.isPending
                }
                variant="secondary"
                onClick={() => exportMutation.mutate()}
              >
                <Download size={18} />
                {exportMutation.isPending
                  ? "Đang xuất..."
                  : "Xuất file chuyển tiền"}
              </Button>
            </RequirePermission>
            <RequirePermission permission={permissions.payrollLock}>
              <Button
                disabled={
                  periodStatusMutation.isPending || calculateMutation.isPending
                }
                variant="secondary"
                onClick={handleLockPayroll}
              >
                {isLocked ? <LockOpen size={18} /> : <Lock size={18} />}
                {periodStatusMutation.isPending
                  ? isLocked
                    ? "Đang mở..."
                    : "Đang khóa..."
                  : isLocked
                    ? "Mở khóa kỳ"
                    : "Khóa kỳ"}
              </Button>
            </RequirePermission>
          </>
        }
        description="Kiểm tra bảng lương được tạo từ dữ liệu chấm công trước khi khóa kỳ lương."
        title="Bảng lương"
      />

      <FormulaPickerDialog
        currentFormula={formulaQuery.data}
        isLoadingCurrentFormula={formulaQuery.isLoading}
        isOpen={formulaPickerOpen}
        isPending={calculateMutation.isPending}
        selectedFormulaSource={selectedFormulaSource}
        templates={formulaTemplatesQuery.data ?? []}
        templatesLoading={formulaTemplatesQuery.isLoading}
        onCalculate={handleCalculateWithFormula}
        onOpenChange={setFormulaPickerOpen}
        onSelectFormulaSource={setSelectedFormulaSource}
      />

      <PayrollRecordHistoryDialog
        isLocked={isLocked}
        isOpen={recordHistoryOpen}
        period={period}
        onOpenChange={setRecordHistoryOpen}
        onRestored={(payroll) => {
          queryClient.setQueryData(
            [
              "payroll",
              payroll.period?.month ?? month,
              payroll.period?.year ?? year,
            ],
            payroll,
          );
          void queryClient.invalidateQueries({ queryKey: ["payroll"] });
          void queryClient.invalidateQueries({
            queryKey: ["dashboard-summary"],
          });
        }}
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">
                Bộ lọc bảng lương
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lọc theo kỳ, nhân viên và trạng thái để kiểm tra trước khi khóa
                lương.
              </p>
            </div>
          </div>
          {period ? (
            <Badge tone={isLocked ? "neutral" : "warning"}>
              {payrollStatusLabel[period.status]}
            </Badge>
          ) : (
            <Badge tone="warning">Chưa tạo kỳ</Badge>
          )}
        </div>

        <div className="grid gap-4 px-4 py-4 md:px-5 lg:grid-cols-[220px_minmax(280px,1fr)_180px_auto]">
          <AppMonthPicker
            label="Kỳ lương"
            value={periodDate}
            onChange={setPeriodDate}
          />
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Tìm nhân viên
            </span>
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
            <span className="text-sm font-medium text-foreground">
              Trạng thái
            </span>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as PayrollStatusFilter)
              }
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

        <PayrollViewSettingsPanel visibleColumns={visibleColumns} />

        <PayrollSummaryMetrics
          employeeCount={filteredTotals.employeeCount}
          netSalary={filteredTotals.netSalary}
          visibleColumnSet={visibleColumnSet}
          workDay={filteredTotals.workDay}
        />
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
          title={
            records.length > 0
              ? "Không có bản ghi phù hợp"
              : "Chưa có bản ghi lương"
          }
        />
      ) : (
        <PayrollExcelTable
          formulaSetting={formulaQuery.data}
          isEditable={!isLocked}
          isSaving={updateRecordMutation.isPending}
          records={filteredRecords}
          visibleColumns={visibleColumns}
          onEditRecord={(recordId, field, value) =>
            updateRecordMutation.mutate({ recordId, field, value })
          }
        />
      )}
    </div>
  );
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
