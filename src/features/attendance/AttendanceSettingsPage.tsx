import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Clock, Eye, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { getVietnamCurrentPeriod, VIETNAM_TIME_ZONE } from "@/lib/vietnam-time";

import {
  getAttendanceServerSettings,
  getAttendanceSettings,
  updateAttendanceServerSettings,
  updateAttendanceSettings,
} from "./attendance.service";
import { ColumnChecklist } from "./components/ColumnChecklist";
import type { AttendanceAutoSyncShiftWindow, AttendanceServerSettings, AttendanceSettings } from "./attendance.types";

const defaultSettings: AttendanceSettings = {
  morningStart: "07:30",
  morningEnd: "11:30",
  afternoonStart: "13:30",
  afternoonEnd: "17:30",
  nightStart: "18:00",
  nightEnd: "21:00",
  overtimeRate: 1.5,
  holidayRate: 2,
  weeklyDaysOff: [0],
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
            description="Mốc bắt đầu tính đi trễ ca 3."
            label="Ca 3 vào"
            value={formValues.nightStart}
            onChange={(value) => handleChange("nightStart", value)}
          />
          <TimeField
            description="Mốc kết thúc ca 3 để tính tăng ca cho nhân viên 3 ca."
            label="Ca 3 ra"
            value={formValues.nightEnd}
            onChange={(value) => handleChange("nightEnd", value)}
          />
        </div>
      </section>

      <AttendanceAutoSyncSettingsSection shiftSettings={formValues} />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              <BadgePercent size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Cài đặt lương OT</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lương OT hệ số {formatMultiplier(formValues.overtimeRate)}; lương ngày lễ hệ số{" "}
                {formatMultiplier(formValues.holidayRate)}. Áp dụng khi nhập công và tính lại bảng lương.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-4 py-5 md:grid-cols-2 md:px-5">
          <NumberField
            description="Ví dụ 1.5 nghĩa là mỗi giờ tăng ca được nhân 1,5 lần lương giờ."
            label="Hệ số lương OT"
            value={formValues.overtimeRate}
            onChange={(value) => handleChange("overtimeRate", value)}
          />
          <NumberField
            description="Ví dụ 2 nghĩa là ngày lễ đi làm được tính 2 lần lương ngày."
            label="Hệ số lương ngày lễ"
            value={formValues.holidayRate}
            onChange={(value) => handleChange("holidayRate", value)}
          />
        </div>
        <div className="px-4 pb-5 md:px-5">
          <div className="rounded-md border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-200">Công thức tính OT</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              Lương OT = Lương giờ x Số giờ tăng ca x Hệ số OT.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ngày được đánh dấu lễ sẽ không cộng vào OT; hệ thống tính riêng tiền lễ = lương ngày x công lễ x hệ số lễ.
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

function AttendanceAutoSyncSettingsSection({ shiftSettings }: { shiftSettings: AttendanceSettings }) {
  const serverSettingsQuery = useQuery({
    queryKey: ["attendance-server-settings"],
    queryFn: getAttendanceServerSettings,
  });

  if (serverSettingsQuery.isLoading) {
    return (
      <AttendanceAutoSyncFrame>
        <LoadingState label="Đang tải cấu hình tự động đồng bộ..." />
      </AttendanceAutoSyncFrame>
    );
  }

  if (serverSettingsQuery.isError || !serverSettingsQuery.data) {
    return (
      <AttendanceAutoSyncFrame>
        <ErrorState message="Không tải được cấu hình tự động đồng bộ máy chấm công." />
      </AttendanceAutoSyncFrame>
    );
  }

  return (
    <AttendanceAutoSyncSettingsForm
      key={JSON.stringify(serverSettingsQuery.data)}
      serverSettings={serverSettingsQuery.data}
      shiftSettings={shiftSettings}
    />
  );
}

function AttendanceAutoSyncSettingsForm({
  serverSettings,
  shiftSettings,
}: {
  serverSettings: AttendanceServerSettings;
  shiftSettings: AttendanceSettings;
}) {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState({
    autoSyncEnabled: serverSettings.autoSyncEnabled,
    autoSyncMonthDataId: serverSettings.autoSyncMonthDataId,
    autoSyncMonthMappings: getInitialMonthMappings(serverSettings),
    autoSyncShiftWindows: getInitialShiftWindows(serverSettings, shiftSettings),
    autoSyncStartOffsetMinutes: serverSettings.autoSyncStartOffsetMinutes,
    autoSyncWindowMinutes: serverSettings.autoSyncWindowMinutes,
    autoSyncIntervalMinutes: serverSettings.autoSyncIntervalMinutes,
  });
  const syncWindows = useMemo(
    () => normalizeAutoSyncShiftWindows(formValues.autoSyncShiftWindows),
    [formValues.autoSyncShiftWindows],
  );
  const monthMappingOptions = useMemo(
    () => normalizeMonthMappings(formValues.autoSyncMonthMappings),
    [formValues.autoSyncMonthMappings],
  );
  const selectedAutoSyncMonth = getSelectedMonthMapping(monthMappingOptions, formValues.autoSyncMonthDataId);

  const updateServerSettingsMutation = useMutation({
    mutationFn: updateAttendanceServerSettings,
    onSuccess(data) {
      setFormValues({
        autoSyncEnabled: data.autoSyncEnabled,
        autoSyncMonthDataId: data.autoSyncMonthDataId,
        autoSyncMonthMappings: getInitialMonthMappings(data),
        autoSyncShiftWindows: getInitialShiftWindows(data, shiftSettings),
        autoSyncStartOffsetMinutes: data.autoSyncStartOffsetMinutes,
        autoSyncWindowMinutes: data.autoSyncWindowMinutes,
        autoSyncIntervalMinutes: data.autoSyncIntervalMinutes,
      });
      showSuccess("Đã lưu cấu hình tự động đồng bộ");
      void queryClient.invalidateQueries({ queryKey: ["attendance-server-settings"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const updateShiftWindow = (
    key: AttendanceAutoSyncShiftWindow["key"],
    patch: Partial<AttendanceAutoSyncShiftWindow>,
  ) => {
    setFormValues((current) => ({
      ...current,
      autoSyncShiftWindows: current.autoSyncShiftWindows.map((window) =>
        window.key === key ? { ...window, ...patch } : window,
      ),
    }));
  };

  const handleSave = () => {
    if (formValues.autoSyncEnabled && !serverSettings.hasCookie) {
      showWarning("Cần lưu cookie máy chấm công trước khi bật tự động đồng bộ.");
      return;
    }

    const autoSyncMonthDataId =
      monthMappingOptions.length > 0
        ? (selectedAutoSyncMonth?.monthDataId ?? "")
        : formValues.autoSyncMonthDataId.trim();

    if (formValues.autoSyncEnabled && !autoSyncMonthDataId) {
      showWarning("Vui lòng chọn tháng máy chấm công để tự động đồng bộ.");
      return;
    }
    if (formValues.autoSyncEnabled && syncWindows.every((window) => !window.enabled)) {
      showWarning("Vui lòng bật ít nhất một ca để tự động đồng bộ.");
      return;
    }
    if (syncWindows.some((window) => window.enabled && window.startTime === window.endTime)) {
      showWarning("Giờ bắt đầu và giờ tự tắt của mỗi ca phải khác nhau.");
      return;
    }

    updateServerSettingsMutation.mutate({
      attendanceEndpoint: serverSettings.attendanceEndpoint,
      staffEndpoint: serverSettings.staffEndpoint,
      cookie: "",
      autoSyncEnabled: formValues.autoSyncEnabled,
      autoSyncMonthDataId,
      autoSyncMonthMappings: monthMappingOptions,
      autoSyncShiftWindows: syncWindows,
      autoSyncStartOffsetMinutes: formValues.autoSyncStartOffsetMinutes,
      autoSyncWindowMinutes: formValues.autoSyncWindowMinutes,
      autoSyncIntervalMinutes: formValues.autoSyncIntervalMinutes,
    });
  };

  return (
    <AttendanceAutoSyncFrame
      actions={
        <Button disabled={updateServerSettingsMutation.isPending} variant="secondary" onClick={handleSave}>
          <Save size={16} />
          {updateServerSettingsMutation.isPending ? "Đang lưu..." : "Lưu tự động đồng bộ"}
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.9fr)_1.1fr]">
        <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">Tự động đồng bộ</p>
            </div>
            <Switch
              checked={formValues.autoSyncEnabled}
              onCheckedChange={(checked: boolean) =>
                setFormValues((current) => ({ ...current, autoSyncEnabled: Boolean(checked) }))
              }
            />
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Tháng máy chấm công tự động</span>
              {monthMappingOptions.length > 0 ? (
                <select
                  className="mt-1 h-11 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-semibold text-foreground shadow-[var(--field-shadow)] outline-none transition hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15"
                  disabled={!formValues.autoSyncEnabled}
                  value={selectedAutoSyncMonth?.period ?? ""}
                  onChange={(event) => {
                    const selected = monthMappingOptions.find((mapping) => mapping.period === event.target.value);
                    setFormValues((current) => ({
                      ...current,
                      autoSyncMonthDataId: selected?.monthDataId ?? "",
                    }));
                  }}
                >
                  {monthMappingOptions.map((mapping) => (
                    <option key={mapping.period} value={mapping.period}>
                      {formatPeriodLabel(mapping.period)} - {mapping.monthDataId}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  className="mt-1"
                  disabled={!formValues.autoSyncEnabled}
                  placeholder="Thêm tháng ở khung bên phải trước"
                  value={formValues.autoSyncMonthDataId}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, autoSyncMonthDataId: event.target.value }))
                  }
                />
              )}
            </label>

            <div className="rounded-md border border-sky-200 bg-background/80 px-3 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-background">
              Cronjob backend kiểm tra mỗi phút và tự chạy theo khung giờ đang lưu trong database.
            </div>
          </div>

          <div className="mt-4 rounded-md border border-sky-200 bg-background/80 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Trạng thái gần nhất</p>
            <p className="mt-1 text-muted-foreground">
              {serverSettings.autoSyncLastRunAt
                ? `${formatDateTime(serverSettings.autoSyncLastRunAt)} · ${serverSettings.autoSyncLastMessage ?? "-"}`
                : "Chưa có lần tự động đồng bộ nào"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Khung tự chạy theo giờ vào ca</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Chọn giờ bắt đầu, giờ tự tắt và chu kỳ lặp cho từng ca. Backend đọc cấu hình này mỗi phút.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${formValues.autoSyncEnabled ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}
            >
              {formValues.autoSyncEnabled ? "Đang bật" : "Đang tắt"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {syncWindows.map((window) => (
              <div className="rounded-md border border-border bg-card p-3" key={window.key}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {getShiftWindowLabel(window.key)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {window.enabled
                        ? `${window.startTime} - ${window.endTime} · ${window.intervalMinutes} phút/lần`
                        : "Không tự động đồng bộ ca này"}
                    </p>
                  </div>
                  <Switch
                    checked={window.enabled}
                    disabled={!formValues.autoSyncEnabled}
                    onCheckedChange={(checked: boolean) => updateShiftWindow(window.key, { enabled: Boolean(checked) })}
                  />
                </div>
                <div className="mt-3 grid gap-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">Bắt đầu chạy</span>
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!formValues.autoSyncEnabled || !window.enabled}
                      type="time"
                      value={window.startTime}
                      onChange={(event) => updateShiftWindow(window.key, { startTime: event.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">Tự tắt lúc</span>
                    <input
                      className="mt-1 h-10 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!formValues.autoSyncEnabled || !window.enabled}
                      type="time"
                      value={window.endTime}
                      onChange={(event) => updateShiftWindow(window.key, { endTime: event.target.value })}
                    />
                  </label>
                  <AutoSyncNumberField
                    disabled={!formValues.autoSyncEnabled || !window.enabled}
                    label="Lặp lại mỗi"
                    suffix="phút"
                    value={window.intervalMinutes}
                    onChange={(value) => updateShiftWindow(window.key, { intervalMinutes: value })}
                  />
                </div>
              </div>
            ))}
          </div>

          {!serverSettings.hasCookie ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              Chưa có cookie Yunatt. Vào màn hình Máy chấm công để lưu cookie trước khi bật tự động đồng bộ.
            </p>
          ) : null}

          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Tháng trên máy chấm công</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lưu cặp kỳ HR và monthDataId Yunatt để màn hình Chấm công chọn khi đồng bộ thủ công.
                </p>
              </div>
              <Button
                className="h-8"
                variant="secondary"
                onClick={() =>
                  setFormValues((current) => ({
                    ...current,
                    autoSyncMonthMappings: [
                      ...current.autoSyncMonthMappings,
                      { period: getCurrentPeriod(), monthDataId: "" },
                    ],
                  }))
                }
              >
                <Plus size={15} />
                Thêm tháng
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {formValues.autoSyncMonthMappings.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Chưa có kỳ máy chấm công. Ví dụ: 2026-05 → 59978.
                </div>
              ) : (
                formValues.autoSyncMonthMappings.map((mapping, index) => (
                  <div
                    className="grid gap-2 rounded-md border border-border bg-background p-2 md:grid-cols-[9rem_minmax(10rem,1fr)_auto]"
                    key={`${mapping.period}-${index}`}
                  >
                    <input
                      className="h-10 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                      type="month"
                      value={mapping.period}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          autoSyncMonthMappings: current.autoSyncMonthMappings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, period: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <input
                      className="h-10 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-[var(--field-placeholder)] focus:border-primary focus:ring-4 focus:ring-primary/15"
                      placeholder="monthDataId, ví dụ 59978"
                      value={mapping.monthDataId}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          autoSyncMonthMappings: current.autoSyncMonthMappings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, monthDataId: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Button
                      aria-label="Xóa tháng máy chấm công"
                      className="h-10 px-3"
                      variant="ghost"
                      onClick={() =>
                        setFormValues((current) => ({
                          ...current,
                          autoSyncMonthMappings: current.autoSyncMonthMappings.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AttendanceAutoSyncFrame>
  );
}

function AttendanceAutoSyncFrame({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
            <RefreshCw size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Tự động đồng bộ máy chấm công</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sau giờ vào mỗi ca, hệ thống tự gọi API máy chấm công trong một khoảng thời gian và lặp lại theo chu kỳ.
            </p>
          </div>
        </div>
        {actions}
      </div>

      <div className="px-4 py-5 md:px-5">{children}</div>
    </section>
  );
}

function AutoSyncNumberField({
  label,
  suffix,
  value,
  disabled,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <div className="mt-1 flex h-10 items-center rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] shadow-[var(--field-shadow)] transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        <input
          className="h-full min-w-0 flex-1 rounded-l-md bg-transparent px-3 text-sm font-semibold text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          min={0}
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="border-l border-border px-3 text-xs font-semibold text-muted-foreground">{suffix}</span>
      </div>
    </label>
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

function normalizeSyncNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function formatClockFromMinutes(totalMinutes: number) {
  const minutesPerDay = 24 * 60;
  const normalized = ((totalMinutes % minutesPerDay) + minutesPerDay) % minutesPerDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

const autoSyncShiftKeys: AttendanceAutoSyncShiftWindow["key"][] = ["morning", "afternoon", "night"];

function getInitialShiftWindows(
  settings: AttendanceServerSettings,
  shiftSettings: AttendanceSettings,
): AttendanceAutoSyncShiftWindow[] {
  const normalized = normalizeAutoSyncShiftWindows(settings.autoSyncShiftWindows ?? []);
  if (normalized.length === autoSyncShiftKeys.length) {
    return normalized;
  }

  return buildDefaultShiftWindows(settings, shiftSettings);
}

function normalizeAutoSyncShiftWindows(
  windows: AttendanceAutoSyncShiftWindow[],
): AttendanceAutoSyncShiftWindow[] {
  const mapped = new Map<AttendanceAutoSyncShiftWindow["key"], AttendanceAutoSyncShiftWindow>();
  for (const window of windows) {
    if (!autoSyncShiftKeys.includes(window.key) || !isTimeValue(window.startTime) || !isTimeValue(window.endTime)) {
      continue;
    }

    const intervalMinutes = Math.min(120, Math.max(1, Math.round(Number(window.intervalMinutes) || 10)));
    mapped.set(window.key, {
      key: window.key,
      enabled: Boolean(window.enabled),
      startTime: window.startTime,
      endTime: window.endTime,
      intervalMinutes,
    });
  }

  return autoSyncShiftKeys.flatMap((key) => {
    const window = mapped.get(key);
    return window ? [window] : [];
  });
}

function buildDefaultShiftWindows(
  settings: AttendanceServerSettings,
  shiftSettings: AttendanceSettings,
): AttendanceAutoSyncShiftWindow[] {
  const startOffsetMinutes = normalizeSyncNumber(settings.autoSyncStartOffsetMinutes, 60);
  const windowMinutes = normalizeSyncNumber(settings.autoSyncWindowMinutes, 60);
  const intervalMinutes = Math.min(120, Math.max(1, Math.round(normalizeSyncNumber(settings.autoSyncIntervalMinutes, 10))));
  const shifts: Array<[AttendanceAutoSyncShiftWindow["key"], string]> = [
    ["morning", shiftSettings.morningStart],
    ["afternoon", shiftSettings.afternoonStart],
    ["night", shiftSettings.nightStart],
  ];

  return shifts.map(([key, shiftStart]) => {
    const startMinute = timeToMinutes(shiftStart) + startOffsetMinutes;
    return {
      key,
      enabled: true,
      startTime: formatClockFromMinutes(startMinute),
      endTime: formatClockFromMinutes(startMinute + windowMinutes),
      intervalMinutes,
    };
  });
}

function getShiftWindowLabel(key: AttendanceAutoSyncShiftWindow["key"]) {
  if (key === "morning") {
    return "Ca sáng";
  }
  if (key === "afternoon") {
    return "Ca chiều";
  }
  return "Ca 3";
}

function isTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getInitialMonthMappings(settings: AttendanceServerSettings) {
  const mappings = normalizeMonthMappings(settings.autoSyncMonthMappings);
  if (mappings.length > 0) {
    return mappings;
  }

  return settings.autoSyncMonthDataId.trim()
    ? [{ period: getCurrentPeriod(), monthDataId: settings.autoSyncMonthDataId.trim() }]
    : [];
}

function normalizeMonthMappings(mappings: Array<{ period: string; monthDataId: string }>) {
  const deduped = new Map<string, string>();
  for (const mapping of mappings) {
    const period = mapping.period.trim();
    const monthDataId = mapping.monthDataId.trim();
    if (!/^\d{4}-\d{2}$/.test(period) || !monthDataId) {
      continue;
    }

    deduped.set(period, monthDataId);
  }

  return Array.from(deduped.entries())
    .map(([period, monthDataId]) => ({ period, monthDataId }))
    .sort((left, right) => right.period.localeCompare(left.period));
}

function getSelectedMonthMapping(
  mappings: Array<{ period: string; monthDataId: string }>,
  monthDataId: string,
) {
  const normalizedMonthDataId = monthDataId.trim();
  return (
    mappings.find((mapping) => mapping.monthDataId === normalizedMonthDataId) ??
    mappings.find((mapping) => mapping.period === getCurrentPeriod()) ??
    mappings[0] ??
    null
  );
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-");
  return month && year ? `${month}/${year}` : period;
}

function getCurrentPeriod() {
  return getVietnamCurrentPeriod();
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
  bonusTotal: "Thưởng lễ",
  grossSalary: "Tổng lương",
  employerInsuranceTotal: "BHXH công ty",
  insuranceTotal: "BHXH NLĐ",
  taxTotal: "Thuế TNCN",
  advanceTotal: "Tạm ứng",
  deductionTotal: "Tổng giảm trừ",
  bonus: "Thưởng",
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
  nightCheckInAt: "Ca 3 vào",
  nightCheckOutAt: "Ca 3 ra",
  workDay: "Ngày công",
  lateMinutes: "Đi trễ",
  earlyLeaveMinutes: "Về sớm",
  overtimeMinutes: "Tăng ca",
  status: "Trạng thái",
};
