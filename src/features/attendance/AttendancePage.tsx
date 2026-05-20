import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  Filter,
  RefreshCw,
  Save,
  Search,
  Timer,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { RequirePermission } from "@/components/common/RequirePermission";
import { AppMonthPicker } from "@/components/form/AppMonthPicker";
import { permissions } from "@/constants/permissions";
import {
  attendanceEmployeeViewColumns,
} from "@/features/employee-view-settings/employee-view-settings.types";
import { usePermission } from "@/hooks/use-permission";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import {
  getAttendance,
  getAttendanceServerSettings,
  syncAttendanceServerManual,
  updateAttendanceSummaries,
} from "./attendance.service";
import type { AttendanceServerSettings, AttendanceSummaryRow, UpdateAttendanceSummaryRowInput } from "./attendance.types";

type AttendanceEmployeeGroup = {
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  rows: AttendanceSummaryRow[];
  workDay: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status?: AttendanceSummaryRow["status"];
};

type AttendanceEditRow = Omit<UpdateAttendanceSummaryRowInput, "id"> & {
  id: string;
  workDate?: string;
  workDay: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status?: AttendanceSummaryRow["status"];
};

type AttendanceEditableCellRow = Omit<AttendanceSummaryRow, "id"> & { id?: string };

type AttendanceStatusFilter = "all" | AttendanceSummaryRow["status"];

export function AttendancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEditAttendance = usePermission(permissions.attendanceImport);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isManualSyncOpen, setIsManualSyncOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>("all");
  const now = new Date();
  const month = getValidMonth(searchParams.get("month"), now.getMonth() + 1);
  const year = getValidYear(searchParams.get("year"), now.getFullYear());
  const periodDate = new Date(year, month - 1, 1);

  const attendanceQuery = useQuery({
    queryKey: ["attendance", month, year],
    queryFn: () => getAttendance(month, year),
  });
  const serverSettingsQuery = useQuery({
    enabled: canEditAttendance,
    queryKey: ["attendance-server-settings"],
    queryFn: getAttendanceServerSettings,
  });
  const visibleColumns = useMemo(
    () => attendanceQuery.data?.visibleColumns ?? [...attendanceEmployeeViewColumns],
    [attendanceQuery.data?.visibleColumns],
  );
  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const updateMutation = useMutation({
    mutationFn: updateAttendanceSummaries,
    onSuccess() {
      showSuccess("Cập nhật giờ chấm công thành công");
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });
  const manualSyncMutation = useMutation({
    mutationFn: syncAttendanceServerManual,
    onSuccess(data) {
      showSuccess("Đồng bộ máy chấm công thành công", {
        description: `Đã lấy ${data.fetchedRows}/${data.total} dòng và ghi ${data.attendanceRows} dòng chấm công.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setIsManualSyncOpen(false);
    },
    onError(error) {
      showApiError(error);
    },
  });

  const employeeGroups = useMemo(
    () => buildEmployeeGroups(attendanceQuery.data?.rows ?? []),
    [attendanceQuery.data?.rows],
  );
  const filteredGroups = useMemo(() => {
    const searchText = normalizeSearchText(keyword);

    return employeeGroups.filter((group) => {
      const matchesStatus = statusFilter === "all" || group.status === statusFilter;
      const matchesKeyword =
        searchText.length === 0 ||
        normalizeSearchText(`${group.employeeCode ?? ""} ${group.employeeName ?? ""}`).includes(searchText);

      return matchesStatus && matchesKeyword;
    });
  }, [employeeGroups, keyword, statusFilter]);
  const filteredTotals = useMemo(
    () => ({
      employeeCount: filteredGroups.length,
      workDay: filteredGroups.reduce((total, group) => total + Number(group.workDay), 0),
      lateMinutes: filteredGroups.reduce((total, group) => total + Number(group.lateMinutes), 0),
      overtimeMinutes: filteredGroups.reduce((total, group) => total + Number(group.overtimeMinutes), 0),
    }),
    [filteredGroups],
  );
  const hasActiveFilters = keyword.trim().length > 0 || statusFilter !== "all";
  const selectedGroup = employeeGroups.find((group) => group.employeeId === selectedEmployeeId) ?? null;
  const daysInMonth = useMemo(() => buildDaysInMonth(year, month), [month, year]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Nhập file từ máy chấm công, chuẩn hóa lượt vào/ra, tổng hợp công và tự tính lương."
        actions={
          <RequirePermission permission={permissions.attendanceImport}>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setIsManualSyncOpen(true)}>
                <RefreshCw size={18} />
                Đồng bộ máy chấm công
              </Button>
              <Button onClick={() => navigate("/attendance/import")}>
                <Upload size={18} />
                Nhập chấm công
              </Button>
            </div>
          </RequirePermission>
        }
        title="Chấm công"
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Bộ lọc chấm công</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lọc theo kỳ, nhân viên và trạng thái để rà soát dữ liệu chấm công.
              </p>
            </div>
          </div>
          <Badge tone={employeeGroups.length > 0 ? "success" : "warning"}>
            {employeeGroups.length > 0 ? `${filteredGroups.length}/${employeeGroups.length} nhân viên` : "Chưa có dữ liệu"}
          </Badge>
        </div>

        <div className="grid gap-4 px-4 py-4 md:px-5 lg:grid-cols-[220px_minmax(280px,1fr)_180px_auto]">
          <AppMonthPicker
            label="Kỳ chấm công"
            value={periodDate}
            onChange={(date) =>
              setSearchParams({
                month: String(date.getMonth() + 1),
                year: String(date.getFullYear()),
              })
            }
          />
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Tìm nhân viên</span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={17}
              />
              <input
                className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="Mã NV hoặc tên nhân viên"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Trạng thái</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AttendanceStatusFilter)}
            >
              <option value="all">Tất cả</option>
              <option value="present">Có mặt</option>
              <option value="missing_punch">Thiếu lượt chấm</option>
              <option value="leave">Nghỉ cả ngày</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button
              className="w-full lg:w-auto"
              disabled={!hasActiveFilters}
              variant="secondary"
              onClick={() => {
                setKeyword("");
                setStatusFilter("all");
              }}
            >
              Xóa lọc
            </Button>
          </div>
        </div>

        <div className="grid border-t border-border md:grid-cols-4">
          <Metric icon={Users} label="Nhân viên" value={filteredTotals.employeeCount} />
          {visibleColumnSet.has("workDay") ? (
            <Metric icon={CalendarDays} label="Ngày công" value={formatNumber(filteredTotals.workDay)} />
          ) : null}
          {visibleColumnSet.has("lateMinutes") ? (
            <Metric icon={Clock} label="Phút đi trễ" value={formatNumber(filteredTotals.lateMinutes)} />
          ) : null}
          {visibleColumnSet.has("overtimeMinutes") ? (
            <Metric icon={Timer} label="Phút tăng ca" value={formatNumber(filteredTotals.overtimeMinutes)} />
          ) : null}
        </div>
      </section>

      {attendanceQuery.isLoading ? <LoadingState /> : null}
      {attendanceQuery.isError ? <ErrorState /> : null}
      {!attendanceQuery.isLoading && !attendanceQuery.isError && employeeGroups.length === 0 ? (
        <EmptyState
          description="Nhập file từ máy chấm công để tạo dữ liệu chấm công hằng ngày."
          title="Chưa có dữ liệu chấm công"
        />
      ) : null}
      {!attendanceQuery.isLoading && !attendanceQuery.isError && employeeGroups.length > 0 && filteredGroups.length === 0 ? (
        <EmptyState
          description="Thay đổi từ khóa hoặc trạng thái để xem thêm nhân viên."
          title="Không có dữ liệu phù hợp"
        />
      ) : null}
      {selectedGroup ? (
        <AttendanceDetailPanel
          canEdit={canEditAttendance}
          group={selectedGroup}
          isSaving={updateMutation.isPending}
          key={selectedGroup.employeeId}
          onClose={() => setSelectedEmployeeId(null)}
          onSave={(rows) => updateMutation.mutate(rows)}
        />
      ) : null}

      {!attendanceQuery.isLoading && !attendanceQuery.isError && filteredGroups.length > 0 ? (
        <AttendanceMonthlyMatrixTable
          canEdit={canEditAttendance}
          days={daysInMonth}
          groups={filteredGroups}
          isSaving={updateMutation.isPending}
          month={month}
          onOpenEmployee={setSelectedEmployeeId}
          onSaveRow={(row) => updateMutation.mutate([row])}
          year={year}
        />
      ) : null}

      {isManualSyncOpen ? (
        <ManualServerSyncModal
          defaultMonth={month}
          defaultYear={year}
          isLoadingSettings={serverSettingsQuery.isLoading}
          isSyncing={manualSyncMutation.isPending}
          serverSettings={serverSettingsQuery.data}
          onClose={() => setIsManualSyncOpen(false)}
          onSync={(input) => manualSyncMutation.mutate(input)}
        />
      ) : null}
    </div>
  );
}

function ManualServerSyncModal({
  defaultMonth,
  defaultYear,
  serverSettings,
  isLoadingSettings,
  isSyncing,
  onClose,
  onSync,
}: {
  defaultMonth: number;
  defaultYear: number;
  serverSettings?: AttendanceServerSettings;
  isLoadingSettings: boolean;
  isSyncing: boolean;
  onClose: () => void;
  onSync: (input: { monthDataId: string; sourcePeriod?: string; month: number; year: number }) => void;
}) {
  const defaultPeriod = `${defaultYear}-${String(defaultMonth).padStart(2, "0")}`;
  const mappings = useMemo(() => normalizeServerMonthMappings(serverSettings), [serverSettings]);
  const [targetDate, setTargetDate] = useState(() => new Date(defaultYear, defaultMonth - 1, 1));
  const [sourcePeriod, setSourcePeriod] = useState("");
  const activeSourcePeriod =
    sourcePeriod && mappings.some((mapping) => mapping.period === sourcePeriod)
      ? sourcePeriod
      : (mappings.find((mapping) => mapping.period === defaultPeriod)?.period ?? mappings[0]?.period ?? "");
  const selectedMapping = mappings.find((mapping) => mapping.period === activeSourcePeriod) ?? null;
  const canSync = Boolean(serverSettings?.hasCookie && selectedMapping);

  const handleTargetChange = (date: Date) => {
    setTargetDate(date);
    const nextPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const matchingSource = mappings.find((mapping) => mapping.period === nextPeriod);
    if (matchingSource) {
      setSourcePeriod(matchingSource.period);
    }
  };

  const handleSync = () => {
    if (!selectedMapping) {
      return;
    }

    onSync({
      monthDataId: selectedMapping.monthDataId,
      sourcePeriod: selectedMapping.period,
      month: targetDate.getMonth() + 1,
      year: targetDate.getFullYear(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section
        aria-modal="true"
        className="w-full max-w-3xl rounded-lg border border-border bg-card shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">Đồng bộ thủ công máy chấm công</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chọn tháng trên Yunatt bằng monthDataId và kỳ chấm công đích trong hệ thống.
            </p>
          </div>
          <Button aria-label="Đóng đồng bộ thủ công" className="h-8 w-8 px-0" variant="ghost" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Tháng trên máy chấm công</span>
            <select
              className="h-11 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-semibold text-foreground shadow-[var(--field-shadow)] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              disabled={isLoadingSettings || mappings.length === 0 || isSyncing}
              value={activeSourcePeriod}
              onChange={(event) => setSourcePeriod(event.target.value)}
            >
              {mappings.length === 0 ? (
                <option value="">Chưa cấu hình monthDataId</option>
              ) : (
                mappings.map((mapping) => (
                  <option key={mapping.period} value={mapping.period}>
                    {formatPeriodLabel(mapping.period)} - {mapping.monthDataId}
                  </option>
                ))
              )}
            </select>
            <span className="block text-xs text-muted-foreground">
              Danh sách này lấy từ màn hình Cài đặt chấm công.
            </span>
          </label>

          <AppMonthPicker label="Kỳ chấm công đích" value={targetDate} onChange={handleTargetChange} />
        </div>

        <div className="mx-5 rounded-md border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {isLoadingSettings
            ? "Đang tải cấu hình máy chấm công..."
            : !serverSettings?.hasCookie
              ? "Chưa lưu cookie Yunatt. Vào màn hình Máy chấm công để lưu cookie trước."
              : mappings.length === 0
                ? "Chưa có monthDataId. Vào Cài đặt chấm công để thêm tháng trên máy chấm công."
                : `Sẽ đồng bộ ${formatPeriodLabel(selectedMapping?.period ?? "")} từ Yunatt vào kỳ ${String(targetDate.getMonth() + 1).padStart(2, "0")}/${targetDate.getFullYear()}.`}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <Button disabled={isSyncing} variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={!canSync || isSyncing} onClick={handleSync}>
            <RefreshCw className={isSyncing ? "animate-spin" : ""} size={18} />
            {isSyncing ? "Đang đồng bộ..." : "Đồng bộ"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-card-foreground">{value}</div>
      </div>
    </div>
  );
}

const attendanceTimeSlots = [
  "morningCheckIn",
  "morningCheckOut",
  "afternoonCheckIn",
  "afternoonCheckOut",
  "nightCheckIn",
  "nightCheckOut",
] as const;

type AttendanceTimeSlot = (typeof attendanceTimeSlots)[number];

function AttendanceMonthlyMatrixTable({
  canEdit,
  days,
  groups,
  isSaving,
  month,
  onOpenEmployee,
  onSaveRow,
  year,
}: {
  canEdit: boolean;
  days: number[];
  groups: AttendanceEmployeeGroup[];
  isSaving: boolean;
  month: number;
  onOpenEmployee: (employeeId: string) => void;
  onSaveRow: (row: UpdateAttendanceSummaryRowInput) => void;
  year: number;
}) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="scrollbar-none max-h-[72vh] overflow-auto">
        <table className="min-w-max border-separate border-spacing-0 text-left text-xs">
          <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 dark:bg-muted dark:text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-50 w-28 min-w-28 border-b border-r border-border bg-slate-100 px-3 py-3 text-sm font-semibold dark:bg-muted">
                Person Code
              </th>
              <th className="sticky left-[7rem] z-50 w-64 min-w-64 border-b border-r border-border bg-slate-100 px-3 py-3 text-sm font-semibold shadow-[6px_0_12px_-12px_rgba(15,23,42,0.7)] dark:bg-muted">
                Name
              </th>
              {days.map((day) => (
                <th
                  className="w-32 min-w-32 border-b border-r border-border px-2 py-3 text-center font-semibold tabular-nums"
                  key={day}
                >
                  {String(day).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group, groupIndex) => {
              const stickyBackgroundClass =
                groupIndex % 2 === 0 ? "bg-white dark:bg-background" : "bg-slate-50 dark:bg-muted/40";

              return (
                <tr
                  className={`${groupIndex % 2 === 0 ? "bg-white dark:bg-background" : "bg-slate-50 dark:bg-muted/40"} group align-top transition-colors hover:bg-orange-50/70 dark:hover:bg-primary/10`}
                  key={group.employeeId}
                >
                  <td
                    className={`sticky left-0 z-30 whitespace-nowrap border-b border-r border-border px-3 py-4 text-card-foreground transition-colors group-hover:bg-orange-50 dark:group-hover:bg-primary/10 ${stickyBackgroundClass}`}
                  >
                    {group.employeeCode ?? "-"}
                  </td>
                  <td
                    className={`sticky left-[7rem] z-30 w-64 min-w-64 border-b border-r border-border px-3 py-4 font-medium text-card-foreground shadow-[6px_0_12px_-12px_rgba(15,23,42,0.7)] transition-colors group-hover:bg-orange-50 dark:group-hover:bg-primary/10 ${stickyBackgroundClass}`}
                  >
                    <button
                      className="block max-w-full truncate rounded-sm text-left font-semibold underline-offset-4 hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20"
                      type="button"
                      onClick={() => onOpenEmployee(group.employeeId)}
                    >
                      {group.employeeName ?? "-"}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold leading-5">
                      <span className="rounded-md bg-emerald-50 px-1.5 text-emerald-700 ring-1 ring-emerald-100">
                        {formatNumber(group.workDay)} công
                      </span>
                      <span
                        className={`rounded-md px-1.5 ring-1 ${
                          group.lateMinutes > 0
                            ? "bg-amber-50 text-amber-700 ring-amber-100"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        Muộn {formatMinutesText(group.lateMinutes)}
                      </span>
                      <span
                        className={`rounded-md px-1.5 ring-1 ${
                          group.earlyLeaveMinutes > 0
                            ? "bg-rose-50 text-rose-700 ring-rose-100"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        Sớm {formatMinutesText(group.earlyLeaveMinutes)}
                      </span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const workDate = formatDateKey(year, month, day);
                    const row: AttendanceEditableCellRow =
                      getDayAttendanceRow(group, workDate) ??
                      {
                        employeeId: group.employeeId,
                        employeeCode: group.employeeCode,
                        employeeName: group.employeeName,
                        workDate,
                      };

                    return (
                      <td
                        className="h-36 w-32 min-w-32 border-b border-r border-border bg-white/60 px-2 py-2 align-top text-card-foreground transition-colors group-hover:bg-orange-50/60 dark:bg-background/40 dark:group-hover:bg-primary/10"
                        key={day}
                      >
                        <EditablePunchCell
                          disabled={!canEdit || isSaving}
                          key={`${row.id ?? `${row.employeeId}:${workDate}`}:${buildPunchText(row)}`}
                          row={row}
                          onSave={onSaveRow}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditablePunchCell({
  disabled,
  row,
  onSave,
}: {
  disabled: boolean;
  row: AttendanceEditableCellRow;
  onSave: (row: UpdateAttendanceSummaryRowInput) => void;
}) {
  const initialValue = buildPunchText(row);
  const [value, setValue] = useState(initialValue);
  const normalized = formatPunchTimes(parsePunchText(value).times);
  const isDirty = normalized !== initialValue;

  const handleSave = () => {
    const parsed = parsePunchText(value);
    if (parsed.hasInvalid) {
      showWarning("Giờ chấm công không hợp lệ. Nhập dạng HH:mm, mỗi giờ một dòng.");
      return;
    }

    const normalizedValue = formatPunchTimes(parsed.times);
    setValue(normalizedValue);
    if (normalizedValue === initialValue) {
      return;
    }

    onSave(buildUpdateRowFromPunchTimes(row, parsed.times));
  };

  return (
    <textarea
      className={`min-h-32 w-full cursor-text resize-none rounded-md border px-2 py-1.5 font-mono text-[12px] font-semibold leading-5 tabular-nums text-foreground outline-none transition placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-70 ${
        isDirty
          ? "border-amber-300 bg-amber-50 shadow-inner focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          : "border-slate-200 bg-white shadow-sm hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-background"
      }`}
      disabled={disabled}
      placeholder="-"
      value={value}
      onBlur={handleSave}
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function AttendanceDetailPanel({
  group,
  canEdit,
  isSaving,
  onClose,
  onSave,
}: {
  group: AttendanceEmployeeGroup;
  canEdit: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (rows: UpdateAttendanceSummaryRowInput[]) => void;
}) {
  const [draftRows, setDraftRows] = useState<AttendanceEditRow[]>(() => group.rows.map(toEditRow));

  const handleChange = (id: string, key: keyof UpdateAttendanceSummaryRowInput, value: string) => {
    setDraftRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, [key]: value || null } : row)),
    );
  };

  const handleSave = () => {
    onSave(
      draftRows.map((row) => ({
        id: row.id,
        morningCheckIn: row.morningCheckIn,
        morningCheckOut: row.morningCheckOut,
        afternoonCheckIn: row.afternoonCheckIn,
        afternoonCheckOut: row.afternoonCheckOut,
        nightCheckIn: row.nightCheckIn,
        nightCheckOut: row.nightCheckOut,
      })),
    );
  };

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Chi tiết công{group.employeeCode ? ` - ${group.employeeCode}` : ""}
            {group.employeeName ? ` - ${group.employeeName}` : ""}
          </h2>
          <div className="mt-1 text-sm text-muted-foreground">
            {group.rows.length} ngày, {formatNumber(group.workDay)} ngày công, {formatMinutesText(group.lateMinutes)} đi trễ
          </div>
        </div>
        <Button aria-label="Thu gọn chi tiết công" className="h-8 px-3" variant="ghost" onClick={onClose}>
          <X size={18} />
          Thu gọn
        </Button>
      </div>

      <div className="scrollbar-none max-h-[72vh] overflow-auto px-5 py-4">
        {!canEdit ? (
          <div className="mb-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            Bạn chỉ có quyền xem chi tiết công.
          </div>
        ) : null}
        <table className="min-w-[1080px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#eef4f6] text-muted-foreground dark:bg-muted">
            <tr>
              <th className="w-[104px] whitespace-nowrap px-3 py-3 font-semibold">Ngày</th>
              <th className="w-[136px] whitespace-nowrap px-3 py-3 font-semibold">Ca 1 vào</th>
              <th className="w-[136px] whitespace-nowrap px-3 py-3 font-semibold">Ca 1 ra</th>
              <th className="w-[136px] whitespace-nowrap px-3 py-3 font-semibold">Ca 2 vào</th>
              <th className="w-[136px] whitespace-nowrap px-3 py-3 font-semibold">Ca 2 ra</th>
              <th className="w-[136px] whitespace-nowrap px-3 py-3 font-semibold">Ca 3 vào</th>
              <th className="w-[136px] whitespace-nowrap px-3 py-3 font-semibold">Ca 3 ra</th>
              <th className="w-[86px] whitespace-nowrap px-3 py-3 font-semibold">Ngày công</th>
              <th className="w-[84px] whitespace-nowrap px-3 py-3 font-semibold">Đi trễ</th>
              <th className="w-[84px] whitespace-nowrap px-3 py-3 font-semibold">Về sớm</th>
            </tr>
          </thead>
          <tbody>
            {draftRows.map((row) => (
              <tr className="border-t border-border transition-colors hover:bg-primary/5" key={row.id}>
                <td className="whitespace-nowrap px-3 py-2.5 text-card-foreground">{row.workDate}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <TimeInput
                    disabled={!canEdit || isSaving}
                    value={row.morningCheckIn ?? ""}
                    onChange={(value) => handleChange(row.id, "morningCheckIn", value)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <TimeInput
                    disabled={!canEdit || isSaving}
                    value={row.morningCheckOut ?? ""}
                    onChange={(value) => handleChange(row.id, "morningCheckOut", value)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <TimeInput
                    disabled={!canEdit || isSaving}
                    value={row.afternoonCheckIn ?? ""}
                    onChange={(value) => handleChange(row.id, "afternoonCheckIn", value)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <TimeInput
                    disabled={!canEdit || isSaving}
                    value={row.afternoonCheckOut ?? ""}
                    onChange={(value) => handleChange(row.id, "afternoonCheckOut", value)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <TimeInput
                    disabled={!canEdit || isSaving}
                    value={row.nightCheckIn ?? ""}
                    onChange={(value) => handleChange(row.id, "nightCheckIn", value)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <TimeInput
                    disabled={!canEdit || isSaving}
                    value={row.nightCheckOut ?? ""}
                    onChange={(value) => handleChange(row.id, "nightCheckOut", value)}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-card-foreground">{formatNumber(row.workDay)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-card-foreground">
                  {formatMinutesText(row.lateMinutes)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-card-foreground">
                  {formatMinutesText(row.earlyLeaveMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
        <Button disabled={isSaving} variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={!canEdit || isSaving} onClick={handleSave}>
          <Save size={18} />
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </section>
  );
}

function TimeInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="h-9 w-28 rounded-md border border-border bg-muted/40 px-2 text-sm text-foreground outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function toEditRow(row: AttendanceSummaryRow): AttendanceEditRow {
  return {
    id: row.id,
    workDate: row.workDate,
    morningCheckIn: toTimeInputValue(row.morningCheckInAt),
    morningCheckOut: toTimeInputValue(row.morningCheckOutAt),
    afternoonCheckIn: toTimeInputValue(row.afternoonCheckInAt),
    afternoonCheckOut: toTimeInputValue(row.afternoonCheckOutAt),
    nightCheckIn: toTimeInputValue(row.nightCheckInAt),
    nightCheckOut: toTimeInputValue(row.nightCheckOutAt),
    workDay: Number(row.workDay ?? 0),
    lateMinutes: Number(row.lateMinutes ?? 0),
    earlyLeaveMinutes: Number(row.earlyLeaveMinutes ?? 0),
    overtimeMinutes: Number(row.overtimeMinutes ?? 0),
    status: row.status,
  };
}

function buildDaysInMonth(year: number, month: number) {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, index) => index + 1);
}

function getDayAttendanceRow(group: AttendanceEmployeeGroup, workDate: string) {
  return group.rows.find((currentRow) => currentRow.workDate === workDate) ?? null;
}

function buildPunchText(row: AttendanceEditableCellRow) {
  return formatPunchTimes(getPunchEntries(row).map((entry) => entry.value));
}

function getPunchEntries(row: AttendanceEditableCellRow): Array<{ slot: AttendanceTimeSlot; value: string }> {
  const values: Record<AttendanceTimeSlot, string> = {
    morningCheckIn: toTimeInputValue(row.morningCheckInAt),
    morningCheckOut: toTimeInputValue(row.morningCheckOutAt),
    afternoonCheckIn: toTimeInputValue(row.afternoonCheckInAt),
    afternoonCheckOut: toTimeInputValue(row.afternoonCheckOutAt),
    nightCheckIn: toTimeInputValue(row.nightCheckInAt),
    nightCheckOut: toTimeInputValue(row.nightCheckOutAt),
  };

  return attendanceTimeSlots
    .map((slot) => ({ slot, value: values[slot] }))
    .filter((entry) => entry.value);
}

function parsePunchText(value: string) {
  const normalized = value.replace(/[;,]+/g, "\n").trim();
  if (!normalized || normalized === "-") {
    return { times: [], hasInvalid: false };
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;
  const times: string[] = [];
  let hasInvalid = tokens.length > attendanceTimeSlots.length;

  for (const token of tokens.slice(0, attendanceTimeSlots.length)) {
    if (!timePattern.test(token)) {
      hasInvalid = true;
      continue;
    }

    const [hour = "0", minute = "00"] = token.split(":");
    times.push(`${String(Number(hour)).padStart(2, "0")}:${minute}`);
  }

  return { times, hasInvalid };
}

function formatPunchTimes(times: string[]) {
  return times.filter(Boolean).join("\n");
}

function buildUpdateRowFromPunchTimes(
  row: AttendanceEditableCellRow,
  times: string[],
): UpdateAttendanceSummaryRowInput {
  const next: UpdateAttendanceSummaryRowInput = {
    ...(row.id ? { id: row.id } : { employeeId: row.employeeId, workDate: row.workDate }),
    morningCheckIn: null,
    morningCheckOut: null,
    afternoonCheckIn: null,
    afternoonCheckOut: null,
    nightCheckIn: null,
    nightCheckOut: null,
  };
  const existingSlots = getPunchEntries(row).map((entry) => entry.slot);
  const targetSlots =
    existingSlots.length > 0 && times.length <= existingSlots.length
      ? existingSlots
      : [...attendanceTimeSlots];

  times.slice(0, targetSlots.length).forEach((time, index) => {
    const slot = targetSlots[index];
    if (slot) {
      next[slot] = time;
    }
  });

  return next;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildEmployeeGroups(rows: AttendanceSummaryRow[]) {
  const groups = new Map<string, AttendanceEmployeeGroup>();
  const sortedRows = [...rows].sort((left, right) => (left.workDate ?? "").localeCompare(right.workDate ?? ""));

  for (const row of sortedRows) {
    const current = groups.get(row.employeeId) ?? {
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      rows: [],
      workDay: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      status: "present" as AttendanceSummaryRow["status"],
    };

    current.rows.push(row);
    current.workDay += Number(row.workDay ?? 0);
    current.lateMinutes += Number(row.lateMinutes ?? 0);
    current.earlyLeaveMinutes += Number(row.earlyLeaveMinutes ?? 0);
    current.overtimeMinutes += Number(row.overtimeMinutes ?? 0);
    current.status = getGroupStatus(current.rows);
    groups.set(row.employeeId, current);
  }

  return Array.from(groups.values())
    .map((group) => ({ ...group, workDay: roundNumber(group.workDay) }))
    .sort((left, right) => (left.employeeCode ?? "").localeCompare(right.employeeCode ?? "", "vi", { numeric: true }));
}

function getGroupStatus(rows: AttendanceSummaryRow[]): AttendanceSummaryRow["status"] | undefined {
  if (rows.some((row) => row.status === "missing_punch")) {
    return "missing_punch";
  }

  if (rows.length > 0 && rows.every((row) => row.status === "leave")) {
    return "leave";
  }

  return "present";
}

function toTimeInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  if (hasExplicitTimezone(normalized)) {
    return formatVietnamTime(new Date(normalized));
  }

  const directMatch = normalized.match(/(?:T|\s|^)([01]\d|2[0-3]):([0-5]\d)/);
  if (directMatch) {
    return `${directMatch[1]}:${directMatch[2]}`;
  }

  const date = new Date(normalized);
  return formatVietnamTime(date);
}

function hasExplicitTimezone(value: string) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
}

function formatVietnamTime(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${String(vietnamTime.getUTCHours()).padStart(2, "0")}:${String(vietnamTime.getUTCMinutes()).padStart(
    2,
    "0",
  )}`;
}

function formatMinutesText(value: number) {
  return `${value} phút`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeServerMonthMappings(settings?: AttendanceServerSettings) {
  const mappings = settings?.autoSyncMonthMappings ?? [];
  const deduped = new Map<string, string>();
  for (const mapping of mappings) {
    const period = mapping.period.trim();
    const monthDataId = mapping.monthDataId.trim();
    if (/^\d{4}-\d{2}$/.test(period) && monthDataId) {
      deduped.set(period, monthDataId);
    }
  }

  if (deduped.size === 0 && settings?.autoSyncMonthDataId?.trim()) {
    deduped.set(getCurrentPeriod(), settings.autoSyncMonthDataId.trim());
  }

  return Array.from(deduped.entries())
    .map(([period, monthDataId]) => ({ period, monthDataId }))
    .sort((left, right) => right.period.localeCompare(left.period));
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-");
  return month && year ? `${month}/${year}` : period;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function getValidMonth(value: string | null, fallback: number) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback;
}

function getValidYear(value: string | null, fallback: number) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 ? year : fallback;
}
