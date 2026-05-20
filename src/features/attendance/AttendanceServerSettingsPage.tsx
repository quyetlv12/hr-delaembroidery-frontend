import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Database,
  KeyRound,
  RefreshCw,
  Save,
  Search,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCurlRequest } from "@/lib/curl";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import {
  getAttendanceServerSettings,
  listSavedAttendanceServerStaff,
  syncAttendanceServerStaff,
  updateAttendanceServerSettings,
} from "./attendance.service";
import type {
  AttendanceServerSavedStaffListInput,
  AttendanceServerSavedStaffRow,
  UpdateAttendanceServerSettingsInput,
} from "./attendance.types";

const DEFAULT_ATTENDANCE_ENDPOINT =
  "https://global.yunatt.com/cardRecord/queryForMonth";
const DEFAULT_STAFF_ENDPOINT = "https://global.yunatt.com/staff/query";

const defaultSettingsForm: UpdateAttendanceServerSettingsInput = {
  attendanceEndpoint: "",
  staffEndpoint: "",
  cookie: "",
};

const defaultSavedStaffFilter: AttendanceServerSavedStaffListInput = {
  offset: 0,
  limit: 100,
  search: "",
};

export function AttendanceServerSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] =
    useState<UpdateAttendanceServerSettingsInput>(defaultSettingsForm);
  const [curlText, setCurlText] = useState("");
  const [staffSearchText, setStaffSearchText] = useState("");
  const [savedStaffFilter, setSavedStaffFilter] =
    useState<AttendanceServerSavedStaffListInput>(defaultSavedStaffFilter);

  const settingsQuery = useQuery({
    queryKey: ["attendance-server-settings"],
    queryFn: getAttendanceServerSettings,
  });
  const savedStaffQuery = useQuery({
    queryKey: ["attendance-server-staff", savedStaffFilter],
    queryFn: () => listSavedAttendanceServerStaff(savedStaffFilter),
  });

  const updateMutation = useMutation({
    mutationFn: updateAttendanceServerSettings,
    onSuccess(data) {
      showSuccess("Đã lưu cookie máy chấm công");
      setForm({
        attendanceEndpoint: data.attendanceEndpoint,
        staffEndpoint: data.staffEndpoint,
        cookie: "",
      });
      void queryClient.invalidateQueries({
        queryKey: ["attendance-server-settings"],
      });
    },
    onError(error) {
      showApiError(error);
    },
  });
  const syncStaffMutation = useMutation({
    mutationFn: syncAttendanceServerStaff,
    onSuccess(data) {
      showSuccess(`Đã lưu ${data.savedRows} nhân viên máy chấm công`, {
        description: `Tải ${data.fetchedRows}/${data.total} dòng từ Yunatt.`,
      });
      void queryClient.invalidateQueries({
        queryKey: ["attendance-server-staff"],
      });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const updateField = <K extends keyof UpdateAttendanceServerSettingsInput>(
    field: K,
    value: UpdateAttendanceServerSettingsInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleParseCurl = () => {
    const parsed = parseCurlRequest(curlText);
    if (!parsed.cookie && !parsed.endpoint) {
      showWarning("Không đọc được endpoint hoặc cookie từ curl.");
      return;
    }

    setForm((current) => {
      const next = { ...current };
      if (parsed.cookie) {
        next.cookie = parsed.cookie;
      }
      if (parsed.endpoint?.includes("/staff/")) {
        next.staffEndpoint = parsed.endpoint;
      } else if (parsed.endpoint) {
        next.attendanceEndpoint = parsed.endpoint;
      }
      return next;
    });
    showSuccess("Đã tách dữ liệu từ curl");
  };

  const handleSubmit = () => {
    const attendanceEndpoint =
      form.attendanceEndpoint.trim() ||
      settingsQuery.data?.attendanceEndpoint ||
      DEFAULT_ATTENDANCE_ENDPOINT;
    const staffEndpoint =
      form.staffEndpoint.trim() ||
      settingsQuery.data?.staffEndpoint ||
      DEFAULT_STAFF_ENDPOINT;

    if (!form.cookie?.trim()) {
      showWarning("Vui lòng dán cookie mới hoặc dán curl có cookie.");
      return;
    }

    updateMutation.mutate({
      attendanceEndpoint,
      staffEndpoint,
      cookie: form.cookie.trim(),
    });
  };

  const handleSearchSavedStaff = () => {
    setSavedStaffFilter((current) => ({
      ...current,
      offset: 0,
      search: staffSearchText.trim(),
    }));
  };

  const handleSyncStaff = () => {
    const staffEndpoint =
      form.staffEndpoint.trim() ||
      settingsQuery.data?.staffEndpoint ||
      DEFAULT_STAFF_ENDPOINT;

    if (!settingsQuery.data?.hasCookie) {
      showWarning(
        "Vui lòng lưu cookie máy chấm công trước khi đồng bộ danh sách nhân viên.",
      );
      return;
    }

    syncStaffMutation.mutate({
      endpoint: staffEndpoint,
      cookie: undefined,
      sort: "staff_number",
      order: "asc",
      offset: 0,
      limit: 200,
      search: savedStaffFilter.search,
    });
  };

  if (settingsQuery.isLoading) {
    return <LoadingState label="Đang tải cấu hình máy chấm công..." />;
  }

  if (settingsQuery.isError) {
    return <ErrorState />;
  }

  const settings = settingsQuery.data;
  const attendanceEndpoint =
    form.attendanceEndpoint ||
    settings?.attendanceEndpoint ||
    DEFAULT_ATTENDANCE_ENDPOINT;
  const staffEndpoint =
    form.staffEndpoint || settings?.staffEndpoint || DEFAULT_STAFF_ENDPOINT;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate("/attendance/server-sync-test")}
          >
            <ArrowLeft size={18} />
            Test đồng bộ
          </Button>
        }
        description="Lưu cookie phiên Yunatt dùng chung cho API lấy danh sách chấm công và danh sách staff."
        title="Cấu hình máy chấm công"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trạng thái cookie</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {settings?.hasCookie ? "Đã lưu" : "Chưa lưu"}
              </p>
            </div>
          </div>
          <p className="mt-3 break-all rounded-md bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
            {settings?.cookiePreview || "Chưa có cookie"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Server size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Endpoint đang dùng
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">
                2 API Yunatt
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Dùng cho `cardRecord/queryForMonth` và `staff/query`.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cập nhật cuối</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatDateTime(settings?.updatedAt)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {settings?.updatedByLoginCode
              ? `Bởi ${settings.updatedByLoginCode}`
              : "Chưa có lịch sử lưu"}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Dán curl để lấy cookie
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Có thể dán curl của API chấm công hoặc API staff. Hệ thống tự lấy
              cookie và endpoint tương ứng.
            </p>
          </div>
          <Button
            disabled={!curlText.trim()}
            variant="secondary"
            onClick={handleParseCurl}
          >
            <Clipboard size={17} />
            Tách curl
          </Button>
        </div>
        <div className="p-5">
          <textarea
            className="min-h-32 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 font-mono text-xs font-medium text-foreground shadow-[var(--field-shadow)] outline-none transition placeholder:text-[var(--field-placeholder)] hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15"
            placeholder="curl 'https://global.yunatt.com/staff/query' -b 'JSESSIONID=...; AUTOLOTIN=...; VI=1' --data-raw 'sort=staff_number&order=asc&offset=0&limit=15'"
            value={curlText}
            onChange={(event) => setCurlText(event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-semibold text-foreground">
            Thông tin lưu vào database
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cookie mới sẽ thay cookie cũ. Backend không trả full cookie về
            frontend, chỉ hiển thị bản rút gọn.
          </p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="attendance-endpoint">Endpoint lấy chấm công</Label>
            <Input
              id="attendance-endpoint"
              value={attendanceEndpoint}
              onChange={(event) =>
                updateField("attendanceEndpoint", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-endpoint">Endpoint danh sách staff</Label>
            <Input
              id="staff-endpoint"
              value={staffEndpoint}
              onChange={(event) =>
                updateField("staffEndpoint", event.target.value)
              }
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="yunatt-cookie">Cookie phiên Yunatt mới</Label>
            <textarea
              className="min-h-28 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm font-medium text-foreground shadow-[var(--field-shadow)] outline-none transition placeholder:text-[var(--field-placeholder)] hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15"
              id="yunatt-cookie"
              placeholder="JSESSIONID=...; AUTOLOTIN=...; VI=1"
              value={form.cookie ?? ""}
              onChange={(event) => updateField("cookie", event.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end border-t border-border px-5 py-4">
          <Button disabled={updateMutation.isPending} onClick={handleSubmit}>
            <Save size={17} />
            {updateMutation.isPending ? "Đang lưu..." : "Lưu cookie"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Database size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Danh sách nhân viên máy chấm công
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Dữ liệu được lưu vào bảng riêng trong database, kèm raw payload
                đầy đủ từ Yunatt.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={savedStaffQuery.isFetching}
              variant="secondary"
              onClick={() => void savedStaffQuery.refetch()}
            >
              <RefreshCw
                className={savedStaffQuery.isFetching ? "animate-spin" : ""}
                size={17}
              />
              Tải lại bảng
            </Button>
            <Button
              disabled={syncStaffMutation.isPending}
              onClick={handleSyncStaff}
            >
              <RefreshCw
                className={syncStaffMutation.isPending ? "animate-spin" : ""}
                size={17}
              />
              {syncStaffMutation.isPending
                ? "Đang đồng bộ..."
                : "Đồng bộ & lưu staff"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border p-5 md:grid-cols-[minmax(16rem,1fr)_8rem_8rem_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Tìm nhân viên đã lưu
            </span>
            <div className="mt-1 flex h-10 items-center rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 shadow-[var(--field-shadow)] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
              <Search
                className="mr-2 shrink-0 text-muted-foreground"
                size={17}
              />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-[var(--field-placeholder)]"
                placeholder="staffNumber, tên, email, điện thoại..."
                value={staffSearchText}
                onChange={(event) => setStaffSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearchSavedStaff();
                  }
                }}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Offset
            </span>
            <Input
              min={0}
              type="number"
              value={savedStaffFilter.offset}
              onChange={(event) =>
                setSavedStaffFilter((current) => ({
                  ...current,
                  offset: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Limit
            </span>
            <Input
              max={200}
              min={1}
              type="number"
              value={savedStaffFilter.limit}
              onChange={(event) =>
                setSavedStaffFilter((current) => ({
                  ...current,
                  limit: Number(event.target.value) || 50,
                }))
              }
            />
          </label>
          <Button
            className="h-10"
            variant="secondary"
            onClick={handleSearchSavedStaff}
          >
            <Search size={17} />
            Tìm
          </Button>
        </div>

        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              Đã lưu {savedStaffQuery.data?.total ?? 0} nhân viên máy chấm công
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Backend tự phân trang 200 dòng/lần đến khi lưu hết danh sách staff
              trả về.
            </p>
          </div>

          <div className="max-h-[34rem] overflow-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-sky-50 text-xs font-semibold uppercase text-sky-950">
                <tr>
                  <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left">
                    Avatar
                  </th>
                  <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left">
                    staffNumber
                  </th>
                  <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left">
                    Tên Yunatt
                  </th>
                  <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left">
                    Bộ phận
                  </th>
                  <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left">
                    Email
                  </th>
                  <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left">
                    Điện thoại
                  </th>
                  <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left">
                    Chấm công
                  </th>
                  <th className="whitespace-nowrap border-b border-border px-3 py-2 text-left">
                    Đồng bộ cuối
                  </th>
                </tr>
              </thead>
              <tbody>
                {savedStaffQuery.isLoading ? (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-sm font-medium text-muted-foreground"
                      colSpan={8}
                    >
                      Đang tải danh sách đã lưu...
                    </td>
                  </tr>
                ) : savedStaffQuery.isError ? (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-sm font-medium text-danger"
                      colSpan={8}
                    >
                      Không tải được danh sách nhân viên máy chấm công đã lưu.
                    </td>
                  </tr>
                ) : savedStaffQuery.data?.rows.length ? (
                  savedStaffQuery.data.rows.map((staff) => (
                    <tr className="transition hover:bg-amber-50" key={staff.id}>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2">
                        <SavedStaffAvatar staff={staff} />
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2 font-bold text-primary">
                        {staff.staffNumber || "-"}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2 font-semibold">
                        {staff.name || "-"}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2">
                        {staff.departmentName || "-"}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2">
                        {staff.email || "-"}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2">
                        {staff.mobile || "-"}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                            staff.punch
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {staff.punch ? <Check size={13} /> : null}
                          {staff.punch ? "Có" : "Không"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-border px-3 py-2 text-muted-foreground">
                        {formatDateTime(staff.lastSyncedAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-sm font-medium text-muted-foreground"
                      colSpan={8}
                    >
                      Chưa có nhân viên máy chấm công trong database. Bấm Đồng
                      bộ & lưu staff để tải từ Yunatt.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function SavedStaffAvatar({ staff }: { staff: AttendanceServerSavedStaffRow }) {
  const [failed, setFailed] = useState(false);
  const photoUrl = failed ? "" : getYunattPhotoUrl(staff.photo);

  if (photoUrl) {
    return (
      <img
        alt={staff.name || staff.staffNumber || "Yunatt staff"}
        className="h-10 w-10 rounded-lg border border-border bg-muted object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={photoUrl}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-sm font-bold text-muted-foreground">
      {(staff.name || staff.staffNumber || "?")
        .trim()
        .charAt(0)
        .toUpperCase() || "?"}
    </span>
  );
}

function getYunattPhotoUrl(photo: string) {
  const value = photo.trim();
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://global.yunatt.com${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}
