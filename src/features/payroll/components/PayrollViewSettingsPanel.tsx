import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Columns3, LayoutTemplate, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/common/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getEmployeeViewSettings,
  updateEmployeeViewSettings,
} from "@/features/employee-view-settings/employee-view-settings.service";
import {
  attendanceEmployeeViewColumns,
  type PayrollEmployeeViewColumn,
} from "@/features/employee-view-settings/employee-view-settings.types";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import { filterPayrollDisplayColumns, payrollColumnLabels, payrollDisplayColumns } from "../payroll-column-metadata";

type PayrollViewSettingsPanelProps = {
  visibleColumns: PayrollEmployeeViewColumn[];
};

type PayrollViewTemplate = {
  id: string;
  name: string;
  description: string;
  columns: PayrollEmployeeViewColumn[];
};

const requiredTemplateColumns: PayrollEmployeeViewColumn[] = [
  "employeeCode",
  "employeeName",
  "configuredSalary",
  "workDay",
  "earnedSalary",
  "netSalary",
];

export function PayrollViewSettingsPanel({ visibleColumns }: PayrollViewSettingsPanelProps) {
  const queryClient = useQueryClient();
  const viewSettingsQuery = useQuery({
    queryKey: ["employee-view-settings"],
    queryFn: getEmployeeViewSettings,
  });
  const currentPayrollColumns = filterPayrollDisplayColumns(viewSettingsQuery.data?.payrollColumns ?? visibleColumns);
  const currentAttendanceColumns = viewSettingsQuery.data?.attendanceColumns ?? [...attendanceEmployeeViewColumns];
  const [draftColumns, setDraftColumns] = useState<PayrollEmployeeViewColumn[] | null>(null);
  const selectedColumns = draftColumns ?? currentPayrollColumns;
  const templates = useMemo(() => createRandomPayrollTemplates(), []);
  const hasChanges = serializeColumns(selectedColumns) !== serializeColumns(currentPayrollColumns);
  const selectedCount = selectedColumns.length;

  const updateMutation = useMutation({
    mutationFn: updateEmployeeViewSettings,
    onSuccess(data) {
      setDraftColumns(null);
      queryClient.setQueryData(["employee-view-settings"], data);
      showSuccess("Đã cập nhật cột hiển thị bảng lương");
      void queryClient.invalidateQueries({ queryKey: ["employee-view-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleToggleColumn = (column: PayrollEmployeeViewColumn) => {
    setDraftColumns((current) => {
      const baseColumns = current ?? currentPayrollColumns;
      if (baseColumns.includes(column)) {
        if (baseColumns.length === 1) {
          showWarning("Bảng lương cần hiển thị ít nhất một cột");
          return baseColumns;
        }
        return baseColumns.filter((item) => item !== column);
      }

      return normalizePayrollColumns([...baseColumns, column]);
    });
  };

  const handleApplyTemplate = (template: PayrollViewTemplate) => {
    setDraftColumns(template.columns);
  };

  const handleSave = () => {
    if (selectedColumns.length === 0) {
      showWarning("Bảng lương cần hiển thị ít nhất một cột");
      return;
    }

    updateMutation.mutate({
      payrollColumns: normalizePayrollColumns(selectedColumns),
      attendanceColumns: currentAttendanceColumns,
    });
  };

  return (
    <div className="border-t border-border px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Columns3 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Trường hiển thị bảng lương</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn cột cần xem hoặc áp dụng nhanh 3 mẫu hiển thị hệ thống tự sinh.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            {selectedCount}/{payrollDisplayColumns.length} cột
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={viewSettingsQuery.isLoading || updateMutation.isPending} variant="secondary">
                <Columns3 size={16} />
                Chọn cột
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Cột bảng lương</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {payrollDisplayColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  checked={selectedColumns.includes(column)}
                  key={column}
                  onCheckedChange={() => handleToggleColumn(column)}
                  onSelect={(event: Event) => event.preventDefault()}
                >
                  {payrollColumnLabels[column]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={viewSettingsQuery.isLoading || updateMutation.isPending} variant="secondary">
                <LayoutTemplate size={16} />
                Mẫu hiển thị
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Mẫu hiển thị bảng lương</DialogTitle>
                <DialogDescription>Chọn một mẫu để áp dụng nhanh bộ cột hiển thị.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 lg:grid-cols-3">
                {templates.map((template) => (
                  <button
                    className="rounded-md border border-border bg-background px-3 py-3 text-left transition hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring/30"
                    disabled={updateMutation.isPending}
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <LayoutTemplate size={16} />
                      {template.name}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{template.description}</p>
                    <p className="mt-2 text-xs font-medium text-primary">{template.columns.length} cột</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button
            disabled={viewSettingsQuery.isLoading || updateMutation.isPending || !hasChanges}
            onClick={handleSave}
          >
            <Save size={16} />
            {updateMutation.isPending ? "Đang lưu..." : "Lưu hiển thị"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function createRandomPayrollTemplates(): PayrollViewTemplate[] {
  const templateSeeds = [17, 41, 83];
  const templateNames = ["Mẫu ngẫu nhiên 1", "Mẫu ngẫu nhiên 2", "Mẫu ngẫu nhiên 3"];
  const templateDescriptions = [
    "Tập trung lương chính, ngày công và thực nhận.",
    "Ưu tiên phụ cấp, lương ngày và tổng lương.",
    "Ưu tiên bảo hiểm, giảm trừ và thực nhận.",
  ];

  return templateSeeds.map((seed, index) => {
    const optionalColumns = payrollDisplayColumns.filter((column) => !requiredTemplateColumns.includes(column));
    const shuffledColumns = shuffleColumns(optionalColumns, seed);
    const randomCount = 8 + (seed % 7);
    const columns = normalizePayrollColumns([...requiredTemplateColumns, ...shuffledColumns.slice(0, randomCount)]);

    return {
      id: `payroll-template-${seed}`,
      name: templateNames[index],
      description: templateDescriptions[index],
      columns,
    };
  });
}

function shuffleColumns(columns: PayrollEmployeeViewColumn[], seed: number) {
  return [...columns]
    .map((column, index) => ({ column, weight: seededWeight(seed, index) }))
    .sort((first, second) => first.weight - second.weight)
    .map((item) => item.column);
}

function seededWeight(seed: number, index: number) {
  const value = Math.sin(seed * 997 + index * 131) * 10000;
  return value - Math.floor(value);
}

function normalizePayrollColumns(columns: PayrollEmployeeViewColumn[]) {
  const selectedSet = new Set(columns);
  return payrollDisplayColumns.filter((column) => selectedSet.has(column));
}

function serializeColumns(columns: PayrollEmployeeViewColumn[]) {
  return normalizePayrollColumns(columns).join("|");
}
