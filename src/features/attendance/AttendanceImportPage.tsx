import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  FileSpreadsheet,
  FileUp,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { AppMonthPicker } from "@/components/form/AppMonthPicker";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { confirmResetAttendancePayroll } from "@/lib/confirm";
import { cn } from "@/lib/utils";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import {
  confirmAttendanceImport,
  previewAttendanceImport,
  resetAttendancePayroll,
} from "./attendance.service";
import type {
  AttendancePayrollPreviewRecord,
  AttendancePreview,
  AttendancePreviewRow,
} from "./attendance.types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function AttendanceImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = new Date();
  const [file, setFile] = useState<File | null>(null);
  const [periodDate, setPeriodDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [autoCreateMissingEmployees, setAutoCreateMissingEmployees] =
    useState(true);
  const [preview, setPreview] = useState<AttendancePreview | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const month = periodDate.getMonth() + 1;
  const year = periodDate.getFullYear();

  const previewMutation = useMutation({
    mutationFn: (input: { file: File; month: number; year: number }) =>
      previewAttendanceImport(input),
    onSuccess(result) {
      setPreview(result);
      setPeriodDate(new Date(result.year, result.month - 1, 1));
      showSuccess("Đã tạo preview", {
        description: `${result.totals.employees} nhân viên, ${result.totals.attendanceRows} ô chấm công.`,
      });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!preview) {
        throw new Error("Vui lòng tạo preview trước khi nhập");
      }
      return confirmAttendanceImport({
        fileName: preview.fileName,
        month: preview.month,
        year: preview.year,
        autoCreateMissingEmployees,
        rows: preview.rows,
      });
    },
    onSuccess(result) {
      showSuccess("Đã nhập chấm công và cập nhật tiền công", {
        description: `${result.attendanceRows} dòng chấm công, ${result.payroll.records.length} bản ghi lương.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      navigate(`/attendance?month=${result.month}&year=${result.year}`);
    },
    onError(error) {
      showApiError(error);
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetAttendancePayroll,
    onSuccess(result) {
      setPreview(null);
      showSuccess("Đã reset dữ liệu test", {
        description: `${result.attendanceRows} dòng chấm công, ${result.payrollRecords} bản ghi lương.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const dateColumns = useMemo(() => {
    const dates = new Set<string>();
    for (const row of preview?.rows ?? []) {
      for (const day of row.days) {
        dates.add(day.date);
      }
    }
    return Array.from(dates).sort();
  }, [preview]);

  const handlePreview = () => {
    if (!file) {
      showWarning("Vui lòng chọn file chấm công trước");
      return;
    }
    previewMutation.mutate({ file, month, year });
  };

  const handleResetPeriod = async () => {
    const period = `${String(month).padStart(2, "0")}/${year}`;
    const confirmed = await confirmResetAttendancePayroll(period);
    if (!confirmed) {
      return;
    }

    resetMutation.mutate({ month, year });
  };

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        actions={
          <Button variant="secondary" onClick={() => navigate("/attendance")}>
            <ArrowLeft size={18} />
            Quay lại
          </Button>
        }
        description="Tải file từ máy chấm công, xem trước dữ liệu đã đọc, chỉnh sửa ô cần thiết rồi xác nhận nhập."
        title="Nhập bảng chấm công"
      />

      <section className="space-y-4 border-b border-border pb-5">
        <div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">File chấm công</Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileUp className="text-primary" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file.size < 1024 * 1024
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                </div>
                <button
                  aria-label="Xóa file"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label
                className={cn(
                  "group flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-all duration-200",
                  isDragOver
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/50",
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const droppedFile = e.dataTransfer.files?.[0] ?? null;
                  if (droppedFile) {
                    setFile(droppedFile);
                    setPreview(null);
                    previewMutation.mutate({ file: droppedFile, month, year });
                  }
                }}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    isDragOver
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                  )}
                >
                  <FileUp size={18} />
                </div>
                <p className="text-sm">
                  {isDragOver ? (
                    "Thả file tại đây"
                  ) : (
                    <>
                      <span className="font-medium text-primary">
                        Nhấn để chọn file
                      </span>
                      {" hoặc kéo thả"}
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  .xls, .xlsx, .csv, .txt
                </p>
                <input
                  ref={fileInputRef}
                  accept=".xls,.xlsx,.csv,.txt"
                  className="sr-only"
                  type="file"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setFile(nextFile);
                    setPreview(null);
                    if (nextFile) {
                      previewMutation.mutate({ file: nextFile, month, year });
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
        <AppMonthPicker
          label="Kỳ chấm công"
          value={periodDate}
          onChange={(date) => {
            setPeriodDate(date);
            setPreview(null);
            if (file) {
              previewMutation.mutate({
                file,
                month: date.getMonth() + 1,
                year: date.getFullYear(),
              });
            }
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 text-sm text-foreground">
            <Checkbox
              checked={autoCreateMissingEmployees}
              onCheckedChange={(checked: boolean | "indeterminate") =>
                setAutoCreateMissingEmployees(checked === true)
              }
            />
            Tạo nhân viên còn thiếu từ preview
          </label>
          <div className="flex gap-2">
            <Button
              disabled={resetMutation.isPending}
              variant="danger"
              onClick={handleResetPeriod}
            >
              <RotateCcw size={18} />
              {resetMutation.isPending ? "Đang reset..." : "Reset kỳ này"}
            </Button>
            <Button
              disabled={previewMutation.isPending}
              variant="secondary"
              onClick={handlePreview}
            >
              <FileSpreadsheet size={18} />
              {previewMutation.isPending ? "Đang đọc..." : "Xem lại preview"}
            </Button>
            <Button
              disabled={!preview || confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              <Check size={18} />
              {confirmMutation.isPending ? "Đang nhập..." : "Xác nhận nhập"}
            </Button>
          </div>
        </div>
      </section>

      {preview ? (
        <section className="min-w-0 space-y-4 overflow-hidden">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric
              label="Tháng"
              value={`${String(preview.month).padStart(2, "0")}/${preview.year}`}
            />
            <Metric label="Nhân viên" value={preview.totals.employees} />
            <Metric label="Ô dữ liệu" value={preview.totals.attendanceRows} />
            <Metric
              label="Tổng tiền công"
              value={currencyFormatter.format(
                preview.payrollPreview.totals.netSalary,
              )}
            />
          </div>
          <PayrollPreviewTable records={preview.payrollPreview.records} />
          <div className="w-full max-w-full overflow-hidden rounded-md border border-border bg-card">
            <div className="scrollbar-none max-h-[72vh] overflow-auto">
              <table className="min-w-[1120px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
                  <tr>
                    <th className="w-20 px-3 py-2 font-semibold">Mã NV</th>
                    <th className="w-40 px-3 py-2 font-semibold">Nhân viên</th>
                    <th className="w-40 px-3 py-2 font-semibold">Khớp hồ sơ</th>
                    {dateColumns.map((date) => (
                      <th className="w-28 px-3 py-2 font-semibold" key={date}>
                        {date.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, rowIndex) => (
                    <tr
                      className="border-t border-border"
                      key={`${row.employeeCode}-${row.employeeName}`}
                    >
                      <td className="px-3 py-2 align-top text-card-foreground">
                        {row.employeeCode}
                      </td>
                      <td className="px-3 py-2 align-top text-card-foreground">
                        {row.employeeName}
                      </td>
                      <td className="px-3 py-2 align-top text-card-foreground">
                        {row.matchedEmployeeName ?? "Sẽ tạo mới"}
                      </td>
                      {dateColumns.map((date) => (
                        <td className="px-2 py-2 align-top" key={date}>
                          <textarea
                            className="min-h-20 w-28 resize-y rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                            value={getDayValue(row, date)}
                            onChange={(event) =>
                              updatePreviewCell(
                                rowIndex,
                                date,
                                event.target.value,
                                setPreview,
                              )
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold text-card-foreground">
        {value}
      </div>
    </div>
  );
}

function PayrollPreviewTable({
  records,
}: {
  records: AttendancePayrollPreviewRecord[];
}) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-md border border-border bg-card">
      <div className="scrollbar-none max-h-[72vh] overflow-auto">
        <table className="w-full table-fixed border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="w-[10%] px-3 py-2 font-semibold">Mã NV</th>
              <th className="w-[30%] px-3 py-2 font-semibold">Nhân viên</th>
              <th className="w-[14%] px-3 py-2 text-right font-semibold">
                Ngày công
              </th>
              <th className="w-[16%] px-3 py-2 text-right font-semibold">
                Lương cài đặt
              </th>
              <th className="w-[15%] px-3 py-2 text-right font-semibold text-sky-700">
                Đơn giá công
              </th>
              <th className="w-[15%] px-3 py-2 text-right font-semibold text-primary">
                Tiền công
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                className="border-t border-border hover:bg-muted/30"
                key={`${record.employeeCode}-${record.employeeName}`}
              >
                <td className="px-3 py-2.5 text-card-foreground">
                  {record.employeeCode}
                </td>
                <td
                  className="truncate px-3 py-2.5 font-medium text-card-foreground"
                  title={record.employeeName}
                >
                  {record.employeeName}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-card-foreground">
                  {record.workDay}/{record.standardWorkDay}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-card-foreground">
                  <MoneyValue className="min-w-[104px]" value={record.configuredSalary} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-card-foreground">
                  <MoneyValue className="min-w-[104px]" tone="base" value={record.dailyTotal} />
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-card-foreground">
                  <MoneyValue className="min-w-[108px]" tone="net" value={record.earnedSalary} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getDayValue(row: AttendancePreviewRow, date: string) {
  return row.days.find((day) => day.date === date)?.value ?? "";
}

function updatePreviewCell(
  rowIndex: number,
  date: string,
  value: string,
  setPreview: (
    updater: (current: AttendancePreview | null) => AttendancePreview | null,
  ) => void,
) {
  setPreview((current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      rows: current.rows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        const existingDay = row.days.find((day) => day.date === date);
        if (existingDay) {
          return {
            ...row,
            days: row.days.map((day) =>
              day.date === date ? { ...day, value } : day,
            ),
          };
        }

        return {
          ...row,
          days: [
            ...row.days,
            {
              date,
              column: date.slice(5),
              value,
              times: [],
              workDay: 0,
              lateMinutes: 0,
              earlyLeaveMinutes: 0,
              overtimeMinutes: 0,
              status: "edited",
            },
          ],
        };
      }),
    };
  });
}
