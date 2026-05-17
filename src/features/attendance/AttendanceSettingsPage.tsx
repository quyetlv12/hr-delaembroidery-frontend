import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Clock, Eye, Save } from "lucide-react";
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
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import {
  getAttendanceSettings,
  updateAttendanceSettings,
} from "./attendance.service";
import { ColumnChecklist } from "./components/ColumnChecklist";
import type { AttendanceSettings } from "./attendance.types";

const defaultSettings: AttendanceSettings = {
  morningStart: "07:30",
  morningEnd: "11:30",
  afternoonStart: "13:30",
  afternoonEnd: "17:30",
  nightStart: "18:00",
  nightEnd: "21:00",
  overtimeRate: 1.5,
};
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
  const [formValues, setFormValues] = useState<AttendanceSettings>(initialValues);
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

      <EmployeeViewColumnsSettingsSection />
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
