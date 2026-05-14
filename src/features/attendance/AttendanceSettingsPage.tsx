import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CurrencyInput from "react-currency-input-field";
import { BadgePercent, Calculator, CalendarDays, Clock, Eye, Gift, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getEmployeeViewSettings,
  updateEmployeeViewSettings,
} from "@/features/employee-view-settings/employee-view-settings.service";
import {
  attendanceEmployeeViewColumns,
  payrollEmployeeViewColumns,
  type AttendanceEmployeeViewColumn,
  type EmployeeViewSettings,
  type PayrollEmployeeViewColumn,
} from "@/features/employee-view-settings/employee-view-settings.types";
import { cn } from "@/lib/utils";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";
import { getPayrollFormulaSetting, updatePayrollFormulaSetting } from "@/features/payroll/payroll.service";
import type { PayrollFormulaCategory, PayrollFormulaSetting } from "@/features/payroll/payroll.types";

import {
  getAttendanceMonthSettings,
  getAttendanceSettings,
  updateAttendanceMonthSetting,
  updateAttendanceSettings,
} from "./attendance.service";
import type { AttendanceMonthSetting, AttendanceSettings } from "./attendance.types";

const defaultSettings: AttendanceSettings = {
  morningStart: "07:30",
  morningEnd: "11:30",
  afternoonStart: "13:30",
  afternoonEnd: "17:30",
  nightStart: "18:00",
  nightEnd: "21:00",
  overtimeRate: 1.5,
};
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function AttendanceSettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["attendance-settings"],
    queryFn: getAttendanceSettings,
  });

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SettingsHeader />
        <LoadingState />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div className="space-y-6">
        <SettingsHeader />
        <ErrorState />
      </div>
    );
  }

  const initialValues = { ...defaultSettings, ...settingsQuery.data };

  return <AttendanceSettingsForm key={Object.values(initialValues).join("-")} initialValues={initialValues} />;
}

function AttendanceSettingsForm({ initialValues }: { initialValues: AttendanceSettings }) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [formValues, setFormValues] = useState<AttendanceSettings>(initialValues);
  const [settingsYear, setSettingsYear] = useState(currentYear);
  const monthSettingsQuery = useQuery({
    queryKey: ["attendance-month-settings", settingsYear],
    queryFn: () => getAttendanceMonthSettings(settingsYear),
  });
  const durationText = useMemo(() => {
    const morningMinutes = getDurationMinutes(formValues.morningStart, formValues.morningEnd);
    const afternoonMinutes = getDurationMinutes(formValues.afternoonStart, formValues.afternoonEnd);
    const nightMinutes = getDurationMinutes(formValues.nightStart, formValues.nightEnd);
    return formatDuration(morningMinutes + afternoonMinutes + nightMinutes);
  }, [formValues]);

  const updateMutation = useMutation({
    mutationFn: updateAttendanceSettings,
    onSuccess(data) {
      setFormValues(data);
      showSuccess("Cập nhật cấu hình chấm công thành công");
      void queryClient.invalidateQueries({ queryKey: ["attendance-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });
  const updateMonthMutation = useMutation({
    mutationFn: updateAttendanceMonthSetting,
    onSuccess(data) {
      showSuccess(`Đã cập nhật cấu hình tháng ${String(data.month).padStart(2, "0")}/${data.year}`);
      void queryClient.invalidateQueries({ queryKey: ["attendance-month-settings", data.year] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleChange = <Key extends keyof AttendanceSettings>(key: Key, value: AttendanceSettings[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        actions={
          <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate(formValues)}>
            <Save size={18} />
            {updateMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        }
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Giờ làm việc chuẩn</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tổng thời lượng đang cài đặt: {durationText}. Áp dụng khi nhập file mới hoặc sửa giờ chấm công.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-4 py-5 md:grid-cols-2 md:px-5">
          <TimeField
            description="Mốc bắt đầu tính đi trễ ca sáng."
            label="Ca sáng vào"
            value={formValues.morningStart}
            onChange={(value) => handleChange("morningStart", value)}
          />
          <TimeField
            description="Mốc kết thúc ca sáng để tính về sớm."
            label="Ca sáng ra"
            value={formValues.morningEnd}
            onChange={(value) => handleChange("morningEnd", value)}
          />
          <TimeField
            description="Mốc bắt đầu tính đi trễ ca chiều."
            label="Ca chiều vào"
            value={formValues.afternoonStart}
            onChange={(value) => handleChange("afternoonStart", value)}
          />
          <TimeField
            description="Mốc kết thúc ca chiều để tính tăng ca."
            label="Ca chiều ra"
            value={formValues.afternoonEnd}
            onChange={(value) => handleChange("afternoonEnd", value)}
          />
          <TimeField
            description="Mốc bắt đầu tính đi trễ ca tối."
            label="Ca tối vào"
            value={formValues.nightStart}
            onChange={(value) => handleChange("nightStart", value)}
          />
          <TimeField
            description="Mốc kết thúc ca tối để tính tăng ca cho nhân viên 3 ca."
            label="Ca tối ra"
            value={formValues.nightEnd}
            onChange={(value) => handleChange("nightEnd", value)}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              <BadgePercent size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Cài đặt lương OT</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lương OT đang tính theo hệ số {formatMultiplier(formValues.overtimeRate)}. Áp dụng cho preview nhập công
                và bảng lương khi tính lại.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-4 py-5 md:grid-cols-[minmax(280px,420px)_1fr] md:px-5">
          <NumberField
            description="Ví dụ 1.5 nghĩa là mỗi giờ tăng ca được nhân 1,5 lần lương giờ."
            label="Hệ số lương OT"
            value={formValues.overtimeRate}
            onChange={(value) => handleChange("overtimeRate", value)}
          />
          <div className="rounded-md border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-200">Công thức tính OT</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              Lương OT = Lương giờ x Số giờ tăng ca x Hệ số OT.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Hệ số này chỉ ảnh hưởng phần tăng ca, không thay đổi lương công, phụ cấp, khấu trừ, bảo hiểm hoặc thuế.
            </p>
          </div>
        </div>
      </section>

      <PayrollFormulaSettingsSection />

      <EmployeeViewColumnsSettingsSection />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
              <CalendarDays size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Công chuẩn và tiền lễ theo tháng</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cài số công chuẩn riêng từng tháng. Tiền lễ được cộng vào mục thưởng khi preview nhập công hoặc tính lại bảng lương.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            Năm
            <input
              className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              max={2100}
              min={2000}
              type="number"
              value={settingsYear}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                if (Number.isFinite(nextYear)) {
                  setSettingsYear(nextYear);
                }
              }}
            />
          </label>
        </div>

        <div className="px-4 py-5 md:px-5">
          {monthSettingsQuery.isLoading ? (
            <LoadingState label="Đang tải cấu hình công tháng..." />
          ) : monthSettingsQuery.isError ? (
            <ErrorState message="Không tải được cấu hình công tháng." />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {(monthSettingsQuery.data?.rows ?? []).map((setting) => (
                <MonthlySettingCard
                  isSaving={
                    updateMonthMutation.isPending &&
                    updateMonthMutation.variables?.month === setting.month &&
                    updateMonthMutation.variables?.year === setting.year
                  }
                  key={`${setting.year}-${setting.month}`}
                  setting={setting}
                  onSave={(values) => updateMonthMutation.mutate(values)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsHeader({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeader
      actions={actions}
      description="Thiết lập giờ làm việc và hệ số lương OT để hệ thống tính ngày công, đi trễ, về sớm, tăng ca và bảng lương."
      title="Cài đặt chấm công"
    />
  );
}

function PayrollFormulaSettingsSection() {
  const formulaQuery = useQuery({
    queryKey: ["payroll-formula-settings"],
    queryFn: getPayrollFormulaSetting,
  });

  if (formulaQuery.isLoading) {
    return (
      <PayrollFormulaSettingsFrame>
        <LoadingState label="Đang tải công thức bảng lương..." />
      </PayrollFormulaSettingsFrame>
    );
  }

  if (formulaQuery.isError || !formulaQuery.data) {
    return (
      <PayrollFormulaSettingsFrame>
        <ErrorState message="Không tải được công thức bảng lương." />
      </PayrollFormulaSettingsFrame>
    );
  }

  return (
    <PayrollFormulaSettingsForm
      initialValues={formulaQuery.data}
      key={JSON.stringify(formulaQuery.data)}
    />
  );
}

function PayrollFormulaSettingsForm({ initialValues }: { initialValues: PayrollFormulaSetting }) {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState(initialValues);
  const updateFormulaMutation = useMutation({
    mutationFn: updatePayrollFormulaSetting,
    onSuccess(data) {
      setFormValues(data);
      showSuccess("Cập nhật công thức bảng lương thành công");
      void queryClient.invalidateQueries({ queryKey: ["payroll-formula-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleChange = <Key extends keyof PayrollFormulaSetting>(key: Key, value: PayrollFormulaSetting[Key]) => {
    setFormValues((current) => (current ? { ...current, [key]: value } : current));
  };
  const handleCategoryChange = (
    type: "earningCategories" | "deductionCategories",
    index: number,
    key: keyof PayrollFormulaCategory,
    value: string,
  ) => {
    setFormValues((current) => {
      if (!current) {
        return current;
      }

      const categories = current[type].map((category, categoryIndex) =>
        categoryIndex === index ? { ...category, [key]: value } : category,
      );
      return { ...current, [type]: categories };
    });
  };
  const handleAddCategory = (type: "earningCategories" | "deductionCategories") => {
    setFormValues((current) => {
      if (!current) {
        return current;
      }

      const nextIndex = current[type].length + 1;
      const prefix = type === "earningCategories" ? "cong" : "tru";
      return {
        ...current,
        [type]: [
          ...current[type],
          {
            key: `${prefix}${nextIndex}`,
            name: type === "earningCategories" ? "Khoản cộng mới" : "Khoản trừ mới",
            formula: "0",
          },
        ],
      };
    });
  };
  const handleRemoveCategory = (type: "earningCategories" | "deductionCategories", index: number) => {
    setFormValues((current) => {
      if (!current || current[type].length <= 1) {
        return current;
      }

      return {
        ...current,
        [type]: current[type].filter((_, categoryIndex) => categoryIndex !== index),
      };
    });
  };

  const handleSave = () => {
    if (
      !isValidFormulaCategories(formValues.earningCategories) ||
      !isValidFormulaCategories(formValues.deductionCategories)
    ) {
      showWarning(
        "Mã mục, tên mục và công thức không được để trống. Mã mục chỉ dùng chữ không dấu, số và dấu gạch dưới.",
      );
      return;
    }

    updateFormulaMutation.mutate(formValues);
  };

  return (
    <PayrollFormulaSettingsFrame
      actions={
        <Button disabled={updateFormulaMutation.isPending} variant="secondary" onClick={handleSave}>
          <Save size={16} />
          {updateFormulaMutation.isPending ? "Đang lưu..." : "Lưu công thức"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
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
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <FormulaCategoryEditor
            categories={formValues.earningCategories}
            title="Danh mục cộng"
            onAdd={() => handleAddCategory("earningCategories")}
            onChange={(index, key, value) => handleCategoryChange("earningCategories", index, key, value)}
            onRemove={(index) => handleRemoveCategory("earningCategories", index)}
          />
          <FormulaCategoryEditor
            categories={formValues.deductionCategories}
            title="Danh mục trừ"
            onAdd={() => handleAddCategory("deductionCategories")}
            onChange={(index, key, value) => handleCategoryChange("deductionCategories", index, key, value)}
            onRemove={(index) => handleRemoveCategory("deductionCategories", index)}
          />
        </div>

        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">Biến công thức</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            thucHuong, luongBHXH, congChuan, ngayCong, baoHiemNgay, luongNgayThucHuong, phuCapTrachNhiem,
            phuCapAnCa, phuCapDienThoai, phuCapKpi, phuCapKhac, thuongLe, luongThang, luongTangCa, tongLuong,
            tongGiamTru và mã mục đã tạo ở trên.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SettingTextArea
            description="Tính tổng lương ngày."
            label="Công thức lương ngày"
            value={formValues.dailySalaryFormula}
            onChange={(value) => handleChange("dailySalaryFormula", value)}
          />
          <SettingTextArea
            description="Tính tổng lương trước giảm trừ."
            label="Công thức tổng lương"
            value={formValues.grossSalaryFormula}
            onChange={(value) => handleChange("grossSalaryFormula", value)}
          />
          <SettingTextArea
            description="Tính tổng các khoản giảm trừ."
            label="Công thức giảm trừ"
            value={formValues.deductionFormula}
            onChange={(value) => handleChange("deductionFormula", value)}
          />
          <SettingTextArea
            description="Tính lương thực nhận."
            label="Công thức thực nhận"
            value={formValues.netSalaryFormula}
            onChange={(value) => handleChange("netSalaryFormula", value)}
          />
        </div>
      </div>
    </PayrollFormulaSettingsFrame>
  );
}

function PayrollFormulaSettingsFrame({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
            <Calculator size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Công thức bảng lương</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cài danh mục cộng, danh mục trừ và công thức tính lương theo mẫu file bảng lương.
            </p>
          </div>
        </div>
        {actions}
      </div>

      <div className="px-4 py-5 md:px-5">{children}</div>
    </section>
  );
}

function EmployeeViewColumnsSettingsSection() {
  const viewSettingsQuery = useQuery({
    queryKey: ["employee-view-settings"],
    queryFn: getEmployeeViewSettings,
  });

  if (viewSettingsQuery.isLoading) {
    return (
      <EmployeeViewColumnsFrame>
        <LoadingState label="Đang tải cấu hình cột nhân viên..." />
      </EmployeeViewColumnsFrame>
    );
  }

  if (viewSettingsQuery.isError || !viewSettingsQuery.data) {
    return (
      <EmployeeViewColumnsFrame>
        <ErrorState message="Không tải được cấu hình cột nhân viên được xem." />
      </EmployeeViewColumnsFrame>
    );
  }

  return (
    <EmployeeViewColumnsSettingsForm
      initialValues={viewSettingsQuery.data}
      key={JSON.stringify(viewSettingsQuery.data)}
    />
  );
}

function EmployeeViewColumnsSettingsForm({ initialValues }: { initialValues: EmployeeViewSettings }) {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState(initialValues);
  const updateViewSettingsMutation = useMutation({
    mutationFn: updateEmployeeViewSettings,
    onSuccess(data) {
      setFormValues(data);
      showSuccess("Cập nhật cột nhân viên được xem thành công");
      void queryClient.invalidateQueries({ queryKey: ["employee-view-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handlePayrollToggle = (column: PayrollEmployeeViewColumn) => {
    setFormValues((current) => ({
      ...current,
      payrollColumns: toggleColumn(current.payrollColumns, column),
    }));
  };
  const handleAttendanceToggle = (column: AttendanceEmployeeViewColumn) => {
    setFormValues((current) => ({
      ...current,
      attendanceColumns: toggleColumn(current.attendanceColumns, column),
    }));
  };
  const handleSave = () => {
    if (formValues.payrollColumns.length === 0 || formValues.attendanceColumns.length === 0) {
      showWarning("Mỗi màn hình cần chọn ít nhất một cột cho nhân viên xem");
      return;
    }

    updateViewSettingsMutation.mutate(formValues);
  };

  return (
    <EmployeeViewColumnsFrame
      actions={
        <Button disabled={updateViewSettingsMutation.isPending} variant="secondary" onClick={handleSave}>
          <Save size={16} />
          {updateViewSettingsMutation.isPending ? "Đang lưu..." : "Lưu cột hiển thị"}
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ColumnChecklist
          columns={payrollEmployeeViewColumns}
          labels={payrollColumnLabels}
          selectedColumns={formValues.payrollColumns}
          title="Cột bảng lương"
          onToggle={handlePayrollToggle}
        />
        <ColumnChecklist
          columns={attendanceEmployeeViewColumns}
          labels={attendanceColumnLabels}
          selectedColumns={formValues.attendanceColumns}
          title="Cột chấm công"
          onToggle={handleAttendanceToggle}
        />
      </div>
    </EmployeeViewColumnsFrame>
  );
}

function EmployeeViewColumnsFrame({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
            <Eye size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Cột nhân viên được xem</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn các cột được phép hiển thị khi tài khoản nhân viên xem chấm công và bảng lương của chính họ.
            </p>
          </div>
        </div>
        {actions}
      </div>

      <div className="px-4 py-5 md:px-5">{children}</div>
    </section>
  );
}

function ColumnChecklist<TColumn extends string>({
  title,
  columns,
  labels,
  selectedColumns,
  onToggle,
}: {
  title: string;
  columns: readonly TColumn[];
  labels: Record<TColumn, string>;
  selectedColumns: TColumn[];
  onToggle: (column: TColumn) => void;
}) {
  const selectedSet = new Set(selectedColumns);

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs font-medium text-muted-foreground">
          {selectedColumns.length}/{columns.length} cột
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {columns.map((column) => (
          <label
            className="flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            key={column}
          >
            <input
              checked={selectedSet.has(column)}
              className="h-4 w-4 accent-primary"
              type="checkbox"
              onChange={() => onToggle(column)}
            />
            <span>{labels[column]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const PAYROLL_VARIABLES = [
  { key: "thucHuong", name: "Thực hưởng" },
  { key: "luongBHXH", name: "Lương BHXH" },
  { key: "congChuan", name: "Công chuẩn" },
  { key: "ngayCong", name: "Ngày công" },
  { key: "baoHiemNgay", name: "Bảo hiểm ngày" },
  { key: "luongNgayThucHuong", name: "Lương ngày" },
  { key: "phuCapTrachNhiem", name: "P.Cấp trách nhiệm" },
  { key: "phuCapAnCa", name: "P.Cấp ăn ca" },
  { key: "phuCapDienThoai", name: "P.Cấp đ.thoại" },
  { key: "phuCapKpi", name: "P.Cấp KPI" },
  { key: "phuCapKhac", name: "P.Cấp khác" },
  { key: "thuongLe", name: "Thưởng lễ" },
  { key: "luongThang", name: "Lương tháng" },
  { key: "luongTangCa", name: "Lương tăng ca" },
  { key: "tongLuong", name: "Tổng lương" },
  { key: "tongGiamTru", name: "Tổng giảm trừ" },
];

function FormulaCategoryEditor({
  title,
  categories,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string;
  categories: PayrollFormulaCategory[];
  onAdd: () => void;
  onChange: (index: number, key: keyof PayrollFormulaCategory, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [suggestionState, setSuggestionState] = useState<{
    isOpen: boolean;
    filter: string;
    cursorPos: number;
  }>({ isOpen: false, filter: "", cursorPos: 0 });

  const handleVariableClick = (variableKey: string) => {
    if (focusedIndex !== null) {
      const currentFormula = categories[focusedIndex].formula;
      // If we're coming from the suggestion dropdown, we replace the {{...}} part
      if (suggestionState.isOpen) {
        const textBefore = currentFormula.substring(0, suggestionState.cursorPos - 2);
        const textAfter = currentFormula.substring(suggestionState.cursorPos + suggestionState.filter.length);
        onChange(focusedIndex, "formula", textBefore + variableKey + textAfter);
        setSuggestionState({ isOpen: false, filter: "", cursorPos: 0 });
      } else {
        // Simple append if just clicking from the bank
        onChange(focusedIndex, "formula", currentFormula + (currentFormula && !/[+\-*/(]\s*$/.test(currentFormula) ? " + " : "") + variableKey);
      }
    }
  };

  const handleInputChange = (index: number, value: string, selectionStart: number | null) => {
    onChange(index, "formula", value);
    
    if (selectionStart !== null) {
      const textBeforeCursor = value.substring(0, selectionStart);
      const match = textBeforeCursor.match(/\{\{([^}]*)$/);
      
      if (match) {
        setSuggestionState({
          isOpen: true,
          filter: match[1],
          cursorPos: selectionStart
        });
      } else {
        setSuggestionState({ isOpen: false, filter: "", cursorPos: 0 });
      }
    }
  };

  const filteredVariables = PAYROLL_VARIABLES.filter(v => 
    v.name.toLowerCase().includes(suggestionState.filter.toLowerCase()) || 
    v.key.toLowerCase().includes(suggestionState.filter.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-slate-50/50 p-6 dark:bg-slate-900/20 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calculator size={16} />
          </div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <Button className="h-9 px-4 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95" onClick={onAdd}>
          <Plus size={16} />
          Thêm mục
        </Button>
      </div>

      {/* Variable Bank */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-white dark:bg-slate-900 p-4 shadow-inner">
        <div className="absolute top-0 right-0 p-2 opacity-5">
          <Calculator size={40} />
        </div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-primary" />
          Thư viện trường dữ liệu
        </p>
        <div className="flex flex-wrap gap-2">
          {PAYROLL_VARIABLES.map((v) => (
            <button
              className="cursor-grab active:cursor-grabbing group flex items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-[12px] font-bold text-slate-700 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              draggable
              key={v.key}
              title={`Kéo hoặc Click để chèn: ${v.key}`}
              type="button"
              onClick={() => handleVariableClick(v.key)}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", v.key);
                e.dataTransfer.effectAllowed = "copy";
              }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-[10px] shadow-sm ring-1 ring-black/5 dark:bg-slate-800">
                #
              </span>
              {v.name}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/60 italic">
          * Nhấn ô công thức rồi gõ <code className="font-bold text-primary">{"{{"}</code> để bật gợi ý hoặc kéo trường vào.
        </p>
      </div>

      <div className="grid gap-5">
        {categories.map((category, index) => (
          <div
            className={cn(
              "group relative flex flex-col gap-5 rounded-2xl border bg-white p-6 transition-all duration-300 dark:bg-slate-950",
              focusedIndex === index 
                ? "border-primary/50 shadow-xl shadow-primary/5 ring-1 ring-primary/20" 
                : "border-border shadow-sm hover:border-primary/20 hover:shadow-md"
            )}
            key={`${category.key}-${index}`}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Mã định danh (biến)</span>
                <input
                  className="h-11 w-full rounded-xl border border-border bg-slate-50/50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:bg-slate-900/50 dark:text-white"
                  placeholder="Ví dụ: thuong_kpi"
                  value={category.key}
                  onChange={(event) => onChange(index, "key", event.target.value)}
                  onFocus={() => {
                    setFocusedIndex(index);
                    setSuggestionState({ isOpen: false, filter: "", cursorPos: 0 });
                  }}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Tên hiển thị trên bảng lương</span>
                <input
                  className="h-11 w-full rounded-xl border border-border bg-slate-50/50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:bg-slate-900/50 dark:text-white"
                  placeholder="Ví dụ: Thưởng KPI"
                  value={category.name}
                  onChange={(event) => onChange(index, "name", event.target.value)}
                  onFocus={() => {
                    setFocusedIndex(index);
                    setSuggestionState({ isOpen: false, filter: "", cursorPos: 0 });
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Cấu trúc công thức</span>
                {category.formula && (
                   <span className="text-[10px] font-mono text-primary/60">Math Expression OK</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute top-1/2 left-4 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors">
                  <Calculator size={20} />
                </div>
                <input
                  className={cn(
                    "h-14 w-full rounded-xl border border-border pl-12 pr-14 font-mono text-base font-bold outline-none transition-all duration-300",
                    focusedIndex === index 
                      ? "bg-primary/5 text-primary border-primary/30 ring-4 ring-primary/10" 
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
                  )}
                  placeholder="Gõ {{ để gợi ý trường dữ liệu..."
                  value={category.formula}
                  onBlur={() => {
                    // Use timeout to allow clicking suggestions
                    setTimeout(() => {
                      if (!suggestionState.isOpen) setFocusedIndex(null);
                    }, 200);
                  }}
                  onChange={(event) => handleInputChange(index, event.target.value, event.target.selectionStart)}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("ring-8", "ring-primary/20", "border-primary");
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("ring-8", "ring-primary/20", "border-primary");
                    setFocusedIndex(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-8", "ring-primary/20", "border-primary");
                    const data = e.dataTransfer.getData("text/plain");
                    if (data) {
                      const start = e.currentTarget.selectionStart ?? category.formula.length;
                      const end = e.currentTarget.selectionEnd ?? category.formula.length;
                      const nextValue =
                        category.formula.substring(0, start) +
                        data +
                        category.formula.substring(end);
                      onChange(index, "formula", nextValue);
                    }
                  }}
                  onFocus={() => setFocusedIndex(index)}
                  onKeyDown={(e) => {
                    if (suggestionState.isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape")) {
                      // We could implement keyboard navigation here
                      if (e.key === "Escape") setSuggestionState({ isOpen: false, filter: "", cursorPos: 0 });
                    }
                  }}
                />
                
                {/* Autocomplete Dropdown */}
                {suggestionState.isOpen && focusedIndex === index && (
                  <div className="absolute left-10 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-white p-1 shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Gợi ý trường</div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredVariables.length > 0 ? (
                        filteredVariables.map((v) => (
                          <button
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                            key={v.key}
                            type="button"
                            onClick={() => handleVariableClick(v.key)}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                              #
                            </span>
                            <div className="flex flex-col">
                              <span>{v.name}</span>
                              <span className="text-[10px] text-muted-foreground">{v.key}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy trường nào</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    aria-label="Xóa mục"
                    className="h-10 w-10 p-0 rounded-lg hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                    disabled={categories.length <= 1}
                    variant="ghost"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Logic Preview */}
            <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50/50 px-4 py-3 dark:bg-slate-900/40">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <span className="text-[10px] font-bold">=</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{category.name || "Mục này"}</span>
                  <span className="text-slate-400">=</span>
                  {category.formula ? (
                    <div className="flex flex-wrap items-center gap-1 font-mono text-[13px] font-bold text-primary">
                       {category.formula.split(/([+\-*/()])/).map((part, i) => {
                         const variable = PAYROLL_VARIABLES.find(v => v.key === part.trim());
                         if (variable) {
                           return <span className="rounded-md bg-primary/10 px-1.5 py-0.5" key={i}>{variable.name}</span>;
                         }
                         return <span key={i}>{part}</span>;
                       })}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Chưa có công thức</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlySettingCard({
  setting,
  isSaving,
  onSave,
}: {
  setting: AttendanceMonthSetting;
  isSaving: boolean;
  onSave: (values: {
    month: number;
    year: number;
    standardWorkDay: number;
    holidayPaidDays: number;
    holidayBonusAmount: number;
  }) => void;
}) {
  const [standardWorkDay, setStandardWorkDay] = useState(setting.standardWorkDay);
  const [holidayPaidDays, setHolidayPaidDays] = useState(setting.holidayPaidDays);
  const [holidayBonusAmount, setHolidayBonusAmount] = useState(setting.holidayBonusAmount);
  const holidayBonusTotal = holidayPaidDays * holidayBonusAmount;

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-card-foreground">
            Tháng {String(setting.month).padStart(2, "0")}/{setting.year}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng tiền lễ: {currencyFormatter.format(holidayBonusTotal)}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <Gift size={17} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <CompactNumberField
          label="Số công chuẩn"
          max={31}
          step={0.5}
          value={standardWorkDay}
          onChange={setStandardWorkDay}
        />
        <CompactNumberField
          label="Số ngày nghỉ lễ"
          max={31}
          step={0.5}
          value={holidayPaidDays}
          onChange={setHolidayPaidDays}
        />
        <CompactCurrencyField
          label="Tiền cộng / ngày lễ"
          value={holidayBonusAmount}
          onChange={setHolidayBonusAmount}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          disabled={isSaving}
          variant="secondary"
          onClick={() =>
            onSave({
              month: setting.month,
              year: setting.year,
              standardWorkDay,
              holidayPaidDays,
              holidayBonusAmount,
            })
          }
        >
          <Save size={16} />
          {isSaving ? "Đang lưu..." : "Lưu tháng"}
        </Button>
      </div>
    </div>
  );
}

function CompactNumberField({
  label,
  value,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        max={max}
        min={0}
        step={step}
        type="number"
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          onChange(Number.isFinite(nextValue) ? nextValue : 0);
        }}
      />
    </label>
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

function SettingTextArea({
  label,
  description,
  value,
  minRows = 3,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  minRows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-md border border-border bg-background p-4">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea
        className="mt-2 w-full resize-y rounded-md border border-border bg-card px-3 py-2 font-mono text-sm leading-6 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        rows={minRows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="mt-2 block text-sm leading-5 text-muted-foreground">{description}</span>
    </label>
  );
}

function TimeField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-md border border-border bg-background p-4">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-md border border-border bg-card px-3 text-base font-semibold text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="mt-2 block text-sm leading-5 text-muted-foreground">{description}</span>
    </label>
  );
}

function NumberField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-md border border-border bg-background p-4">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-2 flex h-11 items-center rounded-md border border-border bg-card transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        <input
          className="h-full min-w-0 flex-1 rounded-md bg-transparent px-3 text-base font-semibold text-foreground outline-none"
          max={10}
          min={0}
          step={0.1}
          type="number"
          value={value}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            onChange(Number.isFinite(nextValue) ? nextValue : 0);
          }}
        />
        <span className="border-l border-border px-3 text-sm font-medium text-muted-foreground">lần</span>
      </div>
      <span className="mt-2 block text-sm leading-5 text-muted-foreground">{description}</span>
    </label>
  );
}

function getDurationMinutes(start: string, end: string) {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (remainMinutes === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${remainMinutes} phút`;
}

function formatMultiplier(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)} lần`;
}

function isValidFormulaCategories(categories: PayrollFormulaCategory[]) {
  return categories.every((category) => {
    const key = category.key.trim();
    return (
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) &&
      category.name.trim().length > 0 &&
      category.formula.trim().length > 0
    );
  });
}

function toggleColumn<TColumn extends string>(columns: TColumn[], column: TColumn) {
  return columns.includes(column) ? columns.filter((currentColumn) => currentColumn !== column) : [...columns, column];
}

const payrollColumnLabels: Record<PayrollEmployeeViewColumn, string> = {
  employeeCode: "Mã NV",
  employeeName: "Nhân viên",
  departmentName: "Phòng ban",
  positionName: "Chức vụ",
  email: "Email",
  configuredSalary: "Thực hưởng",
  insuranceSalary: "Lương BHXH",
  fixedDailySalary: "Lương cố định",
  responsibilityAllowance: "Trách nhiệm",
  mealAllowance: "Ăn ca",
  phoneAllowance: "Điện thoại",
  kpiAllowance: "KPI",
  dailyTotal: "Tổng lương ngày",
  workDay: "Số công",
  overtimeWorkDay: "Công tăng ca",
  totalWorkDay: "Tổng công",
  earnedSalary: "Lương trong tháng",
  overtimeTotal: "Lương tăng ca",
  grossSalary: "Tổng lương",
  employerInsuranceTotal: "BHXH công ty",
  insuranceTotal: "BHXH NLĐ",
  taxTotal: "Thuế TNCN",
  advanceTotal: "Tạm ứng",
  deductionTotal: "Tổng giảm trừ",
  netSalary: "Thực nhận",
  dependentNote: "Ghi chú NPT",
  status: "Trạng thái",
};

const attendanceColumnLabels: Record<AttendanceEmployeeViewColumn, string> = {
  employeeCode: "Mã NV",
  employeeName: "Nhân viên",
  workDate: "Ngày",
  morningCheckInAt: "Ca 1 vào",
  morningCheckOutAt: "Ca 1 ra",
  afternoonCheckInAt: "Ca 2 vào",
  afternoonCheckOutAt: "Ca 2 ra",
  nightCheckInAt: "Ca tối vào",
  nightCheckOutAt: "Ca tối ra",
  workDay: "Ngày công",
  lateMinutes: "Đi trễ",
  earlyLeaveMinutes: "Về sớm",
  overtimeMinutes: "Tăng ca",
  status: "Trạng thái",
};
