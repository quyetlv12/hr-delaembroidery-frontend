import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, RotateCcw } from "lucide-react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmAction } from "@/lib/confirm";
import { showApiError, showSuccess } from "@/lib/toast";

import { payrollColumnLabels } from "../payroll-column-metadata";
import { getPayrollRecordHistory, revertPayrollRecordHistory } from "../payroll.service";
import type { PayrollRecordHistoryEntry, PayrollRecordSnapshot, PayrollResponse, SalaryPeriod } from "../payroll.types";

type PayrollRecordHistoryDialogProps = {
  isLocked: boolean;
  isOpen: boolean;
  period: SalaryPeriod | null | undefined;
  onOpenChange: (open: boolean) => void;
  onRestored: (payroll: PayrollResponse) => void;
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const actionLabel: Record<string, string> = {
  update: "Sửa bảng lương",
  revert: "Back lịch sử",
};

const fieldLabels: Record<string, string> = {
  ...payrollColumnLabels,
  standardWorkDay: "Công chuẩn",
  allowanceTotal: "Tổng phụ cấp",
  bonusTotal: "Tổng thưởng",
  totalInsurance: "Tổng BHXH",
};

const dayFields = new Set(["workDay", "standardWorkDay", "overtimeWorkDay", "totalWorkDay"]);

export function PayrollRecordHistoryDialog({
  isLocked,
  isOpen,
  period,
  onOpenChange,
  onRestored,
}: PayrollRecordHistoryDialogProps) {
  const queryClient = useQueryClient();
  const historyQuery = useQuery({
    queryKey: ["payroll-record-history", period?.id],
    queryFn: () => getPayrollRecordHistory(period?.id ?? ""),
    enabled: isOpen && Boolean(period?.id),
  });
  const revertMutation = useMutation({
    mutationFn: async (entry: PayrollRecordHistoryEntry) => {
      const confirmed = await confirmAction({
        title: "Back về lịch sử sửa bảng lương?",
        description: `Dòng lương của ${entry.employeeName} sẽ quay về dữ liệu trước lần sửa này. Chỉ thực hiện được khi kỳ lương chưa khóa.`,
        confirmText: "Back",
        intent: "warning",
      });
      if (!confirmed) {
        return null;
      }

      return revertPayrollRecordHistory(entry.id);
    },
    onSuccess(payroll) {
      if (!payroll) {
        return;
      }

      showSuccess("Đã khôi phục lịch sử bảng lương");
      onRestored(payroll);
      void queryClient.invalidateQueries({ queryKey: ["payroll-record-history", period?.id] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const histories = historyQuery.data ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Lịch sử sửa bảng lương</DialogTitle>
          <DialogDescription>
            Xem các lần sửa trực tiếp trên bảng lương và back lại dữ liệu trước lần sửa.
          </DialogDescription>
        </DialogHeader>

        {!period ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Chưa có kỳ lương để xem lịch sử.
          </div>
        ) : null}

        {period ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-sm font-semibold text-foreground">
                Kỳ lương {String(period.month).padStart(2, "0")}/{period.year}
              </div>
              <Badge tone={isLocked ? "neutral" : "warning"}>{isLocked ? "Đã khóa" : "Chưa khóa"}</Badge>
            </div>

            {historyQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Đang tải lịch sử sửa bảng lương...
              </div>
            ) : null}

            {historyQuery.isError ? (
              <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
                Không tải được lịch sử sửa bảng lương.
              </div>
            ) : null}

            {!historyQuery.isLoading && !historyQuery.isError && histories.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Chưa có lịch sử sửa bảng lương cho kỳ này.
              </div>
            ) : null}

            {!historyQuery.isLoading && !historyQuery.isError && histories.length > 0 ? (
              <div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
                {histories.map((entry) => (
                  <HistoryItem
                    entry={entry}
                    isLocked={isLocked}
                    isPending={revertMutation.isPending}
                    key={entry.id}
                    onBack={() => revertMutation.mutate(entry)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HistoryItem({
  entry,
  isLocked,
  isPending,
  onBack,
}: {
  entry: PayrollRecordHistoryEntry;
  isLocked: boolean;
  isPending: boolean;
  onBack: () => void;
}) {
  const primaryField = entry.requestedFields[0] ?? entry.changedFields[0] ?? "netSalary";
  const changedFields = entry.changedFields.slice(0, 6);

  return (
    <div className="rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30 hover:bg-orange-50/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={entry.action === "revert" ? "warning" : "success"}>
              {actionLabel[entry.action] ?? entry.action}
            </Badge>
            <span className="font-semibold text-foreground">
              {entry.employeeCode} · {entry.employeeName}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={13} />
              {formatDateTime(entry.createdAt)}
            </span>
            {entry.changedByLoginCode ? (
              <span className="text-xs text-muted-foreground">bởi {entry.changedByLoginCode}</span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr]">
            <div className="text-sm font-semibold text-muted-foreground">{getFieldLabel(primaryField)}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md bg-muted px-2 py-1 font-semibold text-muted-foreground">
                {formatSnapshotValue(entry.previousSnapshot, primaryField)}
              </span>
              <span className="text-muted-foreground">-&gt;</span>
              <span className="rounded-md bg-primary/10 px-2 py-1 font-semibold text-primary">
                {formatSnapshotValue(entry.nextSnapshot, primaryField)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {changedFields.map((field) => (
              <span
                className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground"
                key={field}
              >
                {getFieldLabel(field)}
              </span>
            ))}
            {entry.changedFields.length > changedFields.length ? (
              <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                +{entry.changedFields.length - changedFields.length} cột
              </span>
            ) : null}
          </div>
        </div>

        <Button disabled={isLocked || isPending} size="sm" variant="secondary" onClick={onBack}>
          <RotateCcw size={15} />
          Back
        </Button>
      </div>
    </div>
  );
}

function getFieldLabel(field: string) {
  return fieldLabels[field] ?? field;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatSnapshotValue(snapshot: PayrollRecordSnapshot, field: string) {
  const value = snapshot[field as keyof PayrollRecordSnapshot];
  if (typeof value !== "number") {
    return value ?? "-";
  }

  if (dayFields.has(field)) {
    return numberFormatter.format(value);
  }

  return currencyFormatter.format(value);
}
