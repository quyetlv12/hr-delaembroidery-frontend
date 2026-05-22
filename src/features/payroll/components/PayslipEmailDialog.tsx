import { AlertCircle, CheckCircle2, Mail, Search, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { SalaryPeriod, SalaryRecord } from "../payroll.types";

export function PayslipEmailDialog({
  isOpen,
  isPending,
  period,
  records,
  onOpenChange,
  onSend,
}: {
  isOpen: boolean;
  isPending: boolean;
  period?: SalaryPeriod | null;
  records: SalaryRecord[];
  onOpenChange: (open: boolean) => void;
  onSend: (recordIds: string[]) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setKeyword("");
      setSelectedIds(new Set(records.map((record) => record.id)));
    }
  }, [isOpen, records]);

  const filteredRecords = useMemo(() => {
    const searchText = normalizeSearchText(keyword);
    if (!searchText) {
      return records;
    }

    return records.filter((record) =>
      normalizeSearchText(`${record.employeeCode} ${record.employeeName} ${record.email}`).includes(searchText),
    );
  }, [keyword, records]);

  const allFilteredSelected =
    filteredRecords.length > 0 && filteredRecords.every((record) => selectedIds.has(record.id));
  const selectedRecords = records.filter((record) => selectedIds.has(record.id));
  const selectedWithoutEmail = selectedRecords.filter((record) => !record.email?.trim()).length;
  const periodLabel = period ? `${String(period.month).padStart(2, "0")}/${period.year}` : "--/----";

  const toggleRecord = (recordId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(recordId);
      } else {
        next.delete(recordId);
      }
      return next;
    });
  };

  const toggleFilteredRecords = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const record of filteredRecords) {
        if (checked) {
          next.add(record.id);
        } else {
          next.delete(record.id);
        }
      }
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail size={18} />
            </div>
            <div>
              <DialogTitle>Gửi phiếu lương PDF</DialogTitle>
              <DialogDescription className="mt-1">
                Kỳ {periodLabel}. Mặc định chọn toàn bộ nhân viên trong bảng lương.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 md:grid-cols-3">
          <SummaryItem icon={<Users size={16} />} label="Nhân viên đã chọn" value={`${selectedIds.size}/${records.length}`} />
          <SummaryItem
            icon={<CheckCircle2 size={16} />}
            label="Có email"
            value={`${Math.max(0, selectedIds.size - selectedWithoutEmail)} người`}
          />
          <SummaryItem
            icon={<AlertCircle size={16} />}
            label="Thiếu email"
            tone={selectedWithoutEmail > 0 ? "warning" : "neutral"}
            value={`${selectedWithoutEmail} người`}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
              <Search className="shrink-0 text-muted-foreground" size={17} />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                placeholder="Tìm mã NV, tên hoặc email"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-primary/10 hover:text-primary">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={(checked: boolean | "indeterminate") => toggleFilteredRecords(Boolean(checked))}
              />
              Chọn tất cả đang hiển thị
            </label>
          </div>

          <div className="max-h-[46vh] overflow-y-auto rounded-md border border-border">
            {filteredRecords.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">Không có nhân viên phù hợp.</div>
            ) : (
              filteredRecords.map((record) => {
                const hasEmail = Boolean(record.email?.trim());
                const checked = selectedIds.has(record.id);

                return (
                  <label
                    className={cn(
                      "grid cursor-pointer gap-3 border-b border-border px-3 py-3 transition last:border-b-0 hover:bg-primary/5 md:grid-cols-[24px_minmax(180px,1fr)_minmax(220px,1.2fr)_140px]",
                      checked && "bg-primary/5",
                    )}
                    key={record.id}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value: boolean | "indeterminate") => toggleRecord(record.id, Boolean(value))}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {record.employeeCode} - {record.employeeName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {record.departmentName || "Chưa có phòng ban"} · {record.positionName || "Chưa có chức vụ"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        hasEmail ? "text-foreground" : "text-destructive",
                      )}
                    >
                      {hasEmail ? record.email : "Chưa có email"}
                    </span>
                    <span className="text-left text-sm font-bold text-primary md:text-right">
                      {formatCurrency(record.netSalary)}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isPending} variant="secondary" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isPending || selectedIds.size === 0} onClick={() => onSend(Array.from(selectedIds))}>
            <Send size={16} />
            {isPending ? "Đang gửi..." : `Gửi ${selectedIds.size} phiếu`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryItem({
  icon,
  label,
  tone = "neutral",
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: "neutral" | "warning";
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-background p-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(value))} đ`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .trim();
}
