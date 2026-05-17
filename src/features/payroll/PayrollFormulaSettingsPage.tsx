import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw, Save, SquareLibrary, Wand2 } from "lucide-react";
import CurrencyInput from "react-currency-input-field";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { confirmAction } from "@/lib/confirm";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import { FormulaColumnEditor } from "./components/FormulaColumnEditor";
import {
  applyPayrollFormulaTemplate,
  getPayrollFormulaHistory,
  getPayrollFormulaSetting,
  getPayrollFormulaTemplates,
  revertPayrollFormulaHistory,
  savePayrollFormulaTemplate,
  updatePayrollFormulaSetting,
} from "./payroll.service";
import type { PayrollFormulaColumn, PayrollFormulaHistoryEntry, PayrollFormulaSetting, PayrollFormulaTemplate } from "./payroll.types";

export function PayrollFormulaSettingsPage() {
  const formulaQuery = useQuery({
    queryKey: ["payroll-formula-settings"],
    queryFn: getPayrollFormulaSetting,
  });

  if (formulaQuery.isLoading) {
    return (
      <div className="space-y-6">
        <FormulaHeader />
        <LoadingState label="Đang tải công thức bảng lương..." />
      </div>
    );
  }

  if (formulaQuery.isError || !formulaQuery.data) {
    return (
      <div className="space-y-6">
        <FormulaHeader />
        <ErrorState message="Không tải được công thức bảng lương." />
      </div>
    );
  }

  return <PayrollFormulaSettingsForm initialValues={formulaQuery.data} key={JSON.stringify(formulaQuery.data)} />;
}

function PayrollFormulaSettingsForm({ initialValues }: { initialValues: PayrollFormulaSetting }) {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState(initialValues);
  const [templateName, setTemplateName] = useState("");
  const historyQuery = useQuery({
    queryKey: ["payroll-formula-history"],
    queryFn: getPayrollFormulaHistory,
  });
  const templateQuery = useQuery({
    queryKey: ["payroll-formula-templates"],
    queryFn: getPayrollFormulaTemplates,
  });
  const refreshFormulaQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["payroll-formula-settings"] });
    void queryClient.invalidateQueries({ queryKey: ["payroll-formula-history"] });
    void queryClient.invalidateQueries({ queryKey: ["payroll-formula-templates"] });
    void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    void queryClient.invalidateQueries({ queryKey: ["attendance"] });
  };
  const updateFormulaMutation = useMutation({
    mutationFn: updatePayrollFormulaSetting,
    onSuccess(data) {
      setFormValues(data);
      showSuccess("Cập nhật công thức bảng lương thành công");
      refreshFormulaQueries();
    },
    onError(error) {
      showApiError(error);
    },
  });
  const revertFormulaMutation = useMutation({
    mutationFn: revertPayrollFormulaHistory,
    onSuccess(data) {
      setFormValues(data);
      showSuccess("Đã khôi phục công thức");
      refreshFormulaQueries();
    },
    onError(error) {
      showApiError(error);
    },
  });
  const saveTemplateMutation = useMutation({
    mutationFn: savePayrollFormulaTemplate,
    onSuccess() {
      setTemplateName("");
      showSuccess("Đã lưu mẫu công thức");
      refreshFormulaQueries();
    },
    onError(error) {
      showApiError(error);
    },
  });
  const applyTemplateMutation = useMutation({
    mutationFn: applyPayrollFormulaTemplate,
    onSuccess(data) {
      setFormValues(data);
      showSuccess("Đã áp dụng mẫu công thức");
      refreshFormulaQueries();
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleChange = <Key extends keyof PayrollFormulaSetting>(key: Key, value: PayrollFormulaSetting[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };
  const handleColumnFormulaChange = (index: number, formula: string) => {
    setFormValues((current) => ({
      ...current,
      columnFormulas: current.columnFormulas.map((columnFormula, formulaIndex) =>
        formulaIndex === index ? { ...columnFormula, formula } : columnFormula,
      ),
    }));
  };

  const handleSave = () => {
    if (!isValidColumnFormulas(formValues.columnFormulas)) {
      showWarning("Công thức của các cột không được để trống.");
      return;
    }

    updateFormulaMutation.mutate(formValues);
  };
  const handleResetDraft = async () => {
    const confirmed = await confirmAction({
      title: "Reset công thức trên giao diện?",
      description:
        "Thao tác này chỉ xóa các công thức đang nhập trên màn hình. Database chưa thay đổi cho tới khi bấm Lưu công thức.",
      confirmText: "Reset giao diện",
      intent: "warning",
    });
    if (!confirmed) {
      return;
    }

    setFormValues((current) => ({
      ...current,
      columnFormulas: current.columnFormulas.map((columnFormula) => ({ ...columnFormula, formula: "" })),
    }));
    showWarning("Đã reset công thức trên giao diện. Database chưa thay đổi.");
  };
  const handleSaveTemplate = () => {
    const name = templateName.trim();
    if (!name) {
      showWarning("Nhập tên mẫu công thức trước khi lưu.");
      return;
    }
    if (!isValidColumnFormulas(formValues.columnFormulas)) {
      showWarning("Công thức của các cột không được để trống.");
      return;
    }

    saveTemplateMutation.mutate({ name, setting: formValues });
  };
  const handleRevert = async (entry: PayrollFormulaHistoryEntry) => {
    const confirmed = await confirmAction({
      title: "Khôi phục công thức?",
      description: `Hệ thống sẽ quay về phiên bản ${formatDateTime(entry.createdAt)} và tính lại các kỳ chưa khóa.`,
      confirmText: "Khôi phục",
      intent: "warning",
    });
    if (confirmed) {
      revertFormulaMutation.mutate(entry.id);
    }
  };
  const handleApplyTemplate = async (template: PayrollFormulaTemplate) => {
    const confirmed = await confirmAction({
      title: `Áp dụng mẫu ${template.name}?`,
      description: "Mẫu này sẽ thay thế công thức hiện tại và tính lại các kỳ chưa khóa.",
      confirmText: "Áp dụng",
      intent: "warning",
    });
    if (confirmed) {
      applyTemplateMutation.mutate(template.id);
    }
  };

  return (
    <div className="space-y-6">
      <FormulaHeader
        actions={
          <FormulaSaveButton isPending={updateFormulaMutation.isPending} onSave={handleSave} />
        }
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-4 border-b border-border px-4 py-5 md:grid-cols-2 md:px-5 xl:grid-cols-5">
          <CompactCurrencyField
            label="Lương BHXH mặc định"
            value={formValues.insuranceBaseSalary}
            onChange={(value) => handleChange("insuranceBaseSalary", value)}
          />
          <CompactPercentField
            label="Tỷ lệ BHXH NLĐ"
            value={formValues.employeeInsuranceRate}
            onChange={(value) => handleChange("employeeInsuranceRate", value)}
          />
          <CompactPercentField
            label="Tỷ lệ BHXH công ty"
            value={formValues.employerInsuranceRate}
            onChange={(value) => handleChange("employerInsuranceRate", value)}
          />
          <CompactCurrencyField
            label="Ăn ca mặc định"
            value={formValues.defaultMealAllowance}
            onChange={(value) => handleChange("defaultMealAllowance", value)}
          />
          <CompactCurrencyField
            label="Điện thoại mặc định"
            value={formValues.defaultPhoneAllowance}
            onChange={(value) => handleChange("defaultPhoneAllowance", value)}
          />
        </div>

        <FormulaHistoryTemplatePanel
          histories={historyQuery.data ?? []}
          historyLoading={historyQuery.isLoading}
          templateName={templateName}
          templates={templateQuery.data ?? []}
          templatesLoading={templateQuery.isLoading}
          isApplyingTemplate={applyTemplateMutation.isPending}
          isReverting={revertFormulaMutation.isPending}
          isSavingTemplate={saveTemplateMutation.isPending}
          onApplyTemplate={handleApplyTemplate}
          onRevert={handleRevert}
          onSaveTemplate={handleSaveTemplate}
          onTemplateNameChange={setTemplateName}
        />

        <div className="px-4 py-5 md:px-5">
          <FormulaColumnEditor columnFormulas={formValues.columnFormulas} onChange={handleColumnFormulaChange} />
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-wrap justify-end gap-2 lg:right-8">
        <FormulaResetButton
          className="pointer-events-auto shadow-lg"
          disabled={
            updateFormulaMutation.isPending ||
            revertFormulaMutation.isPending ||
            applyTemplateMutation.isPending
          }
          onReset={handleResetDraft}
        />
        <FormulaSaveButton
          className="pointer-events-auto shadow-lg shadow-primary/20"
          isPending={updateFormulaMutation.isPending}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

function FormulaHistoryTemplatePanel({
  histories,
  historyLoading,
  templateName,
  templates,
  templatesLoading,
  isApplyingTemplate,
  isReverting,
  isSavingTemplate,
  onApplyTemplate,
  onRevert,
  onSaveTemplate,
  onTemplateNameChange,
}: {
  histories: PayrollFormulaHistoryEntry[];
  historyLoading: boolean;
  templateName: string;
  templates: PayrollFormulaTemplate[];
  templatesLoading: boolean;
  isApplyingTemplate: boolean;
  isReverting: boolean;
  isSavingTemplate: boolean;
  onApplyTemplate: (template: PayrollFormulaTemplate) => void;
  onRevert: (entry: PayrollFormulaHistoryEntry) => void;
  onSaveTemplate: () => void;
  onTemplateNameChange: (value: string) => void;
}) {
  const [openPanel, setOpenPanel] = useState<"history" | "templates" | null>(null);

  return (
    <div className="border-b border-border px-4 py-5 md:px-5">
      <div className="grid gap-3 xl:grid-cols-2">
        <FormulaPanelButton
          description="Xem các phiên bản đã lưu và quay lại phiên bản cũ."
          icon={<History size={18} />}
          meta={`${histories.length} phiên bản`}
          title="Lịch sử chỉnh sửa"
          onClick={() => setOpenPanel("history")}
        />
        <FormulaPanelButton
          description="Lưu mẫu công thức hiện tại hoặc áp dụng mẫu đã lưu."
          icon={<SquareLibrary size={18} />}
          meta={`${templates.length} mẫu`}
          title="Mẫu công thức"
          onClick={() => setOpenPanel("templates")}
        />
      </div>

      <Dialog open={openPanel === "history"} onOpenChange={(open: boolean) => setOpenPanel(open ? "history" : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lịch sử chỉnh sửa</DialogTitle>
            <DialogDescription>Chọn một phiên bản để khôi phục công thức bảng lương.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {historyLoading ? (
              <FormulaPanelText>Đang tải lịch sử...</FormulaPanelText>
            ) : histories.length === 0 ? (
              <FormulaPanelText>Chưa có lịch sử chỉnh sửa.</FormulaPanelText>
            ) : (
              histories.map((entry) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-2 dark:bg-slate-950"
                  key={entry.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {entry.changeNote ?? actionLabel(entry.action)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                      {entry.changedByLoginCode ? ` • ${entry.changedByLoginCode}` : ""}
                    </p>
                  </div>
                  <Button
                    className="shrink-0"
                    disabled={isReverting}
                    size="sm"
                    variant="secondary"
                    onClick={() => onRevert(entry)}
                  >
                    <RotateCcw size={14} />
                    Back
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openPanel === "templates"} onOpenChange={(open: boolean) => setOpenPanel(open ? "templates" : null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Mẫu công thức</DialogTitle>
            <DialogDescription>Lưu công thức hiện tại thành mẫu hoặc áp dụng mẫu đã lưu.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-slate-950"
              placeholder="Tên mẫu công thức"
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
            />
            <Button disabled={isSavingTemplate} onClick={onSaveTemplate}>
              <Save size={16} />
              {isSavingTemplate ? "Đang lưu..." : "Lưu mẫu"}
            </Button>
          </div>
          <div className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
            {templatesLoading ? (
              <FormulaPanelText>Đang tải mẫu...</FormulaPanelText>
            ) : templates.length === 0 ? (
              <FormulaPanelText>Chưa có mẫu công thức.</FormulaPanelText>
            ) : (
              templates.map((template) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-2 dark:bg-slate-950"
                  key={template.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{template.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(template.createdAt)}
                      {template.createdByLoginCode ? ` • ${template.createdByLoginCode}` : ""}
                    </p>
                  </div>
                  <Button
                    className="shrink-0"
                    disabled={isApplyingTemplate}
                    size="sm"
                    variant="secondary"
                    onClick={() => onApplyTemplate(template)}
                  >
                    <Wand2 size={14} />
                    Áp dụng
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormulaPanelButton({
  description,
  icon,
  meta,
  title,
  onClick,
}: {
  description: string;
  icon: ReactNode;
  meta: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-slate-50/70 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring/30 dark:bg-slate-900/40"
      type="button"
      onClick={onClick}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">{title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
        </span>
      </span>
      <span className="shrink-0 rounded bg-white px-2 py-1 text-[11px] font-bold text-muted-foreground shadow-sm dark:bg-slate-950">
        {meta}
      </span>
    </button>
  );
}

function FormulaPanelText({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-white px-3 py-4 text-center text-sm text-muted-foreground dark:bg-slate-950">
      {children}
    </div>
  );
}

function FormulaResetButton({
  className,
  disabled,
  onReset,
}: {
  className?: string;
  disabled?: boolean;
  onReset: () => void;
}) {
  return (
    <Button className={className} disabled={disabled} variant="secondary" onClick={onReset}>
      <RotateCcw size={18} />
      Reset công thức
    </Button>
  );
}

function FormulaSaveButton({
  className,
  isPending,
  onSave,
}: {
  className?: string;
  isPending: boolean;
  onSave: () => void;
}) {
  return (
    <Button className={className} disabled={isPending} onClick={onSave}>
      <Save size={18} />
      {isPending ? "Đang lưu..." : "Lưu công thức"}
    </Button>
  );
}

function FormulaHeader({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeader
      actions={actions}
      description="Cài công thức trực tiếp cho từng cột cần tính trong bảng lương."
      title="Công thức bảng lương"
    />
  );
}

function CompactCurrencyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <CurrencyInput
        allowDecimals={false}
        allowNegativeValue={false}
        className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        decimalSeparator=","
        decimalsLimit={0}
        groupSeparator="."
        inputMode="numeric"
        prefix=""
        suffix=" đ"
        value={value}
        onValueChange={(nextValue) => onChange(nextValue ? Number(nextValue) : 0)}
      />
    </label>
  );
}

function CompactPercentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 flex h-9 items-center rounded-md border border-border bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        <input
          className="h-full min-w-0 flex-1 rounded-md bg-transparent px-2.5 text-sm font-semibold text-foreground outline-none"
          max={100}
          min={0}
          step={0.1}
          type="number"
          value={value}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            onChange(Number.isFinite(nextValue) ? nextValue : 0);
          }}
        />
        <span className="border-l border-border px-2.5 text-xs font-semibold text-muted-foreground">%</span>
      </div>
    </label>
  );
}

function isValidColumnFormulas(columnFormulas: PayrollFormulaColumn[]) {
  return columnFormulas.every((columnFormula) => columnFormula.formula.trim().length > 0);
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    update: "Cập nhật công thức",
    revert: "Khôi phục công thức",
    template: "Áp dụng mẫu công thức",
  };
  return labels[action] ?? "Thay đổi công thức";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
