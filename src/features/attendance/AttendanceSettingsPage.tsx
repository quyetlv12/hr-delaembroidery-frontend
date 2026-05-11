import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CurrencyInput from "react-currency-input-field";
import { BadgePercent, CalendarDays, Clock, Gift, Save } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { showApiError, showSuccess } from "@/lib/toast";

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
    return formatDuration(morningMinutes + afternoonMinutes);
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

        <div className="grid gap-4 px-4 py-5 md:grid-cols-2 md:px-5 xl:grid-cols-4">
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
