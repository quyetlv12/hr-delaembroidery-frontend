import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, Eye, Filter, Save, Search, Timer, Upload, Users, X, type LucideIcon } from "lucide-react";
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
import { usePermission } from "@/hooks/use-permission";
import { showApiError, showSuccess } from "@/lib/toast";

import { getAttendance, updateAttendanceSummaries } from "./attendance.service";
import type { AttendanceSummaryRow, UpdateAttendanceSummaryRowInput } from "./attendance.types";

const statusTone = {
  present: "success",
  leave: "neutral",
  missing_punch: "warning",
} as const;

const statusLabel = {
  present: "Có mặt",
  leave: "Nghỉ cả ngày",
  missing_punch: "Thiếu lượt chấm",
} as const;

type AttendanceEmployeeGroup = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  rows: AttendanceSummaryRow[];
  workDay: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: AttendanceSummaryRow["status"];
};

type AttendanceEditRow = UpdateAttendanceSummaryRowInput & {
  workDate: string;
  workDay: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  status: AttendanceSummaryRow["status"];
};

type AttendanceStatusFilter = "all" | AttendanceSummaryRow["status"];

export function AttendancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEditAttendance = usePermission(permissions.attendanceImport);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
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

  const updateMutation = useMutation({
    mutationFn: updateAttendanceSummaries,
    onSuccess() {
      showSuccess("Cập nhật giờ chấm công thành công");
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      setSelectedEmployeeId(null);
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
        normalizeSearchText(`${group.employeeCode} ${group.employeeName}`).includes(searchText);

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

  return (
    <div className="space-y-6">
      <PageHeader
        description="Nhập file từ máy chấm công, chuẩn hóa lượt vào/ra, tổng hợp công và tự tính lương."
        actions={
          <RequirePermission permission={permissions.attendanceImport}>
            <Button onClick={() => navigate("/attendance/import")}>
              <Upload size={18} />
              Nhập chấm công
            </Button>
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
          <Metric icon={CalendarDays} label="Ngày công" value={formatNumber(filteredTotals.workDay)} />
          <Metric icon={Clock} label="Phút đi trễ" value={formatNumber(filteredTotals.lateMinutes)} />
          <Metric icon={Timer} label="Phút tăng ca" value={formatNumber(filteredTotals.overtimeMinutes)} />
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
      {!attendanceQuery.isLoading && !attendanceQuery.isError && filteredGroups.length > 0 ? (
        <AttendanceGroupedTable groups={filteredGroups} onOpenEmployee={setSelectedEmployeeId} />
      ) : null}

      {selectedGroup ? (
        <AttendanceDetailModal
          canEdit={canEditAttendance}
          group={selectedGroup}
          isSaving={updateMutation.isPending}
          key={selectedGroup.employeeId}
          onClose={() => setSelectedEmployeeId(null)}
          onSave={(rows) => updateMutation.mutate(rows)}
        />
      ) : null}
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

function AttendanceGroupedTable({
  groups,
  onOpenEmployee,
}: {
  groups: AttendanceEmployeeGroup[];
  onOpenEmployee: (employeeId: string) => void;
}) {
  return (
    <div className="w-full max-w-full overflow-hidden rounded-md border border-border bg-card">
      <div className="scrollbar-none max-h-[72vh] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Mã NV</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Nhân viên</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Số ngày</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Ngày công</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Đi trễ</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Về sớm</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Tăng ca</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Trạng thái</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr className="border-t border-border" key={group.employeeId}>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">{group.employeeCode}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-card-foreground">{group.employeeName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">{group.rows.length}</td>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">{formatNumber(group.workDay)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                  {formatMinutesText(group.lateMinutes)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                  {formatMinutesText(group.earlyLeaveMinutes)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                  {formatMinutesText(group.overtimeMinutes)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                  <Badge tone={statusTone[group.status]}>{statusLabel[group.status]}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-card-foreground">
                  <Button
                    aria-label={`Xem chi tiết ${group.employeeName}`}
                    className="h-8 px-3"
                    variant="secondary"
                    onClick={() => onOpenEmployee(group.employeeId)}
                  >
                    <Eye size={16} />
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceDetailModal({
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
      })),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-md border border-border bg-card shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Chi tiết công - {group.employeeCode} - {group.employeeName}
            </h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {group.rows.length} ngày, {formatNumber(group.workDay)} ngày công, {formatMinutesText(group.lateMinutes)} đi trễ
            </div>
          </div>
          <Button aria-label="Đóng chi tiết công" className="h-8 w-8 px-0" variant="ghost" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-auto px-5 py-4">
          {!canEdit ? (
            <div className="mb-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              Bạn chỉ có quyền xem chi tiết công.
            </div>
          ) : null}
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Ngày</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Ca 1 vào</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Ca 1 ra</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Ca 2 vào</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Ca 2 ra</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Ngày công</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Đi trễ</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Về sớm</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Tăng ca</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {draftRows.map((row) => (
                <tr className="border-t border-border" key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-card-foreground">{row.workDate}</td>
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
                  <td className="whitespace-nowrap px-3 py-2 text-card-foreground">{formatNumber(row.workDay)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-card-foreground">
                    {formatMinutesText(row.lateMinutes)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-card-foreground">
                    {formatMinutesText(row.earlyLeaveMinutes)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-card-foreground">
                    {formatMinutesText(row.overtimeMinutes)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-card-foreground">
                    <Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge>
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
    </div>
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
      className="h-9 w-28 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
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
    workDay: row.workDay,
    lateMinutes: row.lateMinutes,
    earlyLeaveMinutes: row.earlyLeaveMinutes,
    overtimeMinutes: row.overtimeMinutes,
    status: row.status,
  };
}

function buildEmployeeGroups(rows: AttendanceSummaryRow[]) {
  const groups = new Map<string, AttendanceEmployeeGroup>();
  const sortedRows = [...rows].sort((left, right) => left.workDate.localeCompare(right.workDate));

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
    current.workDay += row.workDay;
    current.lateMinutes += row.lateMinutes;
    current.earlyLeaveMinutes += row.earlyLeaveMinutes;
    current.overtimeMinutes += row.overtimeMinutes;
    current.status = getGroupStatus(current.rows);
    groups.set(row.employeeId, current);
  }

  return Array.from(groups.values())
    .map((group) => ({ ...group, workDay: roundNumber(group.workDay) }))
    .sort((left, right) => left.employeeCode.localeCompare(right.employeeCode, "vi", { numeric: true }));
}

function getGroupStatus(rows: AttendanceSummaryRow[]): AttendanceSummaryRow["status"] {
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

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
