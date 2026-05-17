import { Calculator } from "lucide-react";

import { Button } from "@/components/common/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { PayrollFormulaSetting, PayrollFormulaTemplate } from "../payroll.types";

export function FormulaPickerDialog({
  currentFormula,
  isLoadingCurrentFormula,
  isOpen,
  isPending,
  selectedFormulaSource,
  templates,
  templatesLoading,
  onCalculate,
  onOpenChange,
  onSelectFormulaSource,
}: {
  currentFormula?: PayrollFormulaSetting;
  isLoadingCurrentFormula: boolean;
  isOpen: boolean;
  isPending: boolean;
  selectedFormulaSource: string;
  templates: PayrollFormulaTemplate[];
  templatesLoading: boolean;
  onCalculate: () => void;
  onOpenChange: (open: boolean) => void;
  onSelectFormulaSource: (value: string) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chọn công thức tính lương</DialogTitle>
          <DialogDescription>Chọn công thức dùng cho lần tính lại kỳ lương này.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
          <FormulaChoice
            checked={selectedFormulaSource === "current"}
            description={currentFormula ? `${currentFormula.columnFormulas.length} cột công thức` : "Đang tải"}
            disabled={isLoadingCurrentFormula || !currentFormula}
            title="Công thức hiện tại"
            value="current"
            onSelect={onSelectFormulaSource}
          />

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mẫu đã lưu</p>
            <span className="rounded bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground">
              {templates.length} mẫu
            </span>
          </div>

          {templatesLoading ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Đang tải mẫu công thức...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              Chưa có mẫu công thức đã lưu.
            </div>
          ) : (
            templates.map((template) => (
              <FormulaChoice
                checked={selectedFormulaSource === template.id}
                description={`${template.setting.columnFormulas.length} cột - ${formatDateTime(template.createdAt)}`}
                key={template.id}
                title={template.name}
                value={template.id}
                onSelect={onSelectFormulaSource}
              />
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isPending || isLoadingCurrentFormula} onClick={onCalculate}>
            <Calculator size={16} />
            {isPending ? "Đang tính..." : "Tính lương"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormulaChoice({
  checked,
  description,
  disabled,
  title,
  value,
  onSelect,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  title: string;
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition",
        checked ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-border bg-card hover:border-primary/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
      disabled={disabled}
      type="button"
      onClick={() => onSelect(value)}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary bg-primary" : "border-border bg-background",
        )}
      >
        {checked ? <span className="h-2 w-2 rounded-full bg-primary-foreground" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
