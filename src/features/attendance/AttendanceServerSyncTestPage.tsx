import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Braces,
  Clipboard,
  Database,
  Play,
  RotateCcw,
  Save,
  Server,
  Settings,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCurlRequest } from "@/lib/curl";
import { cn } from "@/lib/utils";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import {
  getAttendanceServerSettings,
  importAttendanceServerBody,
  testAttendanceServerSync,
} from "./attendance.service";
import type {
  AttendanceServerSettings,
  AttendanceServerSyncTestInput,
  AttendanceServerSyncTestResponse,
} from "./attendance.types";

const defaultForm: AttendanceServerSyncTestInput = {
  endpoint: "",
  cookie: "",
  monthDataId: "57147",
  order: "asc",
  offset: 0,
  limit: 200,
  search: "",
};
const DEFAULT_ATTENDANCE_ENDPOINT =
  "https://global.yunatt.com/cardRecord/queryForMonth";

export function AttendanceServerSyncTestPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = new Date();
  const [form, setForm] = useState<AttendanceServerSyncTestInput>(defaultForm);
  const [importPeriod, setImportPeriod] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [curlText, setCurlText] = useState("");
  const [adminBodyText, setAdminBodyText] = useState("");
  const [result, setResult] = useState<AttendanceServerSyncTestResponse | null>(
    null,
  );
  const settingsQuery = useQuery({
    queryKey: ["attendance-server-settings"],
    queryFn: getAttendanceServerSettings,
  });

  const testMutation = useMutation({
    mutationFn: testAttendanceServerSync,
    onSuccess(data) {
      setResult(data);
      setAdminBodyText(JSON.stringify({ total: data.total, rows: data.rawRows }, null, 2));
      const firstDate = data.dates[0];
      if (firstDate) {
        const [year, month] = firstDate.split("-").map(Number);
        if (Number.isFinite(month) && Number.isFinite(year)) {
          setImportPeriod({ month, year });
        }
      }
      showSuccess("Đã gọi thử API máy chấm công", {
        description: `${data.fetchedRows}/${data.total} dòng, chưa lưu dữ liệu.`,
      });
    },
    onError(error) {
      showApiError(error);
    },
  });
  const importBodyMutation = useMutation({
    mutationFn: importAttendanceServerBody,
    onSuccess(data) {
      showSuccess(`Đã nhập ${data.attendanceRows} dòng chấm công`, {
        description: `${data.importedEmployees} nhân viên, ${data.unmatchedRows.length} dòng chưa khớp.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const totalPunches = useMemo(
    () => result?.rows.reduce((total, row) => total + row.punchCount, 0) ?? 0,
    [result],
  );
  const monthMappingOptions = useMemo(
    () => normalizeServerMonthMappings(settingsQuery.data),
    [settingsQuery.data],
  );
  const activeMonthDataId = getActiveMonthDataId(form.monthDataId, monthMappingOptions);

  const updateField = <K extends keyof AttendanceServerSyncTestInput>(
    field: K,
    value: AttendanceServerSyncTestInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const runTest = (input: AttendanceServerSyncTestInput) => {
    const endpoint =
      input.endpoint.trim() ||
      settingsQuery.data?.attendanceEndpoint ||
      DEFAULT_ATTENDANCE_ENDPOINT;

    if (!input.cookie?.trim() && !settingsQuery.data?.hasCookie) {
      showWarning(
        "Vui lòng lưu cookie máy chấm công hoặc nhập cookie tạm thời.",
      );
      return;
    }

    if (!input.monthDataId.trim()) {
      showWarning("Vui lòng chọn tháng máy chấm công");
      return;
    }

    testMutation.mutate({
      ...input,
      cookie: input.cookie?.trim() || undefined,
      monthDataId: input.monthDataId.trim(),
      endpoint,
      search: input.search.trim(),
      offset: Number(input.offset) || 0,
      limit: Number(input.limit) || 200,
    });
  };

  const endpointValue =
    form.endpoint ||
    settingsQuery.data?.attendanceEndpoint ||
    DEFAULT_ATTENDANCE_ENDPOINT;

  const handleSubmit = () => {
    runTest({ ...form, monthDataId: activeMonthDataId });
  };

  const handleReset = () => {
    setForm(defaultForm);
    setCurlText("");
    setAdminBodyText("");
    setResult(null);
  };

  const handleParseCurl = (shouldTest: boolean) => {
    const parsed = parseCurlCommand(curlText);
    const changedFields = Object.keys(parsed).length;

    if (changedFields === 0) {
      showWarning("Không đọc được cookie hoặc tham số từ curl");
      return;
    }

    const nextForm = { ...form, ...parsed };
    setForm(nextForm);
    showSuccess("Đã tách dữ liệu từ curl", {
      description: `Đã cập nhật ${changedFields} trường test.`,
    });

    if (shouldTest) {
      runTest({
        ...nextForm,
        monthDataId: getActiveMonthDataId(nextForm.monthDataId, monthMappingOptions),
      });
    }
  };

  const handleUseResultBody = () => {
    if (!result) {
      showWarning("Chưa có response test để dùng.");
      return;
    }

    setAdminBodyText(JSON.stringify({ total: result.total, rows: result.rawRows }, null, 2));
    const firstDate = result.dates[0];
    if (firstDate) {
      const [year, month] = firstDate.split("-").map(Number);
      if (Number.isFinite(month) && Number.isFinite(year)) {
        setImportPeriod({ month, year });
      }
    }
    showSuccess("Đã đưa body test vào form nhập thử");
  };

  const handleImportAdminBody = () => {
    if (!adminBodyText.trim()) {
      showWarning("Vui lòng dán body JSON từ admin hoặc dùng response test vừa lấy.");
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(adminBodyText);
    } catch {
      showWarning("Body admin không phải JSON hợp lệ.");
      return;
    }

    importBodyMutation.mutate({
      month: importPeriod.month,
      year: importPeriod.year,
      fileName: `yunatt-admin-body-${importPeriod.year}-${String(importPeriod.month).padStart(2, "0")}.json`,
      body: parsedBody,
    });
  };

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate("/attendance/server-sync-settings")}
            >
              <Settings size={18} />
              Cấu hình máy chấm công
            </Button>
            <Button variant="secondary" onClick={() => navigate("/attendance")}>
              <ArrowLeft size={18} />
              Quay lại
            </Button>
          </div>
        }
        description="Gọi thử dữ liệu chấm công từ server máy chấm công và xem preview. Màn hình này không ghi vào database."
        title="Test đồng bộ chấm công"
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Clipboard size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Dán curl để tự điền
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hệ thống tự lấy endpoint, cookie và body form-urlencoded từ lệnh
                curl của Yunatt.
              </p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {settingsQuery.data?.hasCookie
              ? "Đang dùng cookie đã lưu"
              : "Chưa lưu cookie"}
          </div>
        </div>

        <div className="space-y-3 p-5">
          <Label htmlFor="yunatt-curl">Curl từ trình duyệt</Label>
          <textarea
            className="min-h-36 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 font-mono text-xs font-medium text-foreground shadow-[var(--field-shadow)] outline-none transition placeholder:text-[var(--field-placeholder)] hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15"
            id="yunatt-curl"
            placeholder="curl 'https://global.yunatt.com/cardRecord/queryForMonth' -b 'JSESSIONID=...' --data-raw 'order=asc&offset=0&limit=15&monthDataId=57147&search='"
            value={curlText}
            onChange={(event) => setCurlText(event.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={!curlText.trim() || testMutation.isPending}
              variant="secondary"
              onClick={() => handleParseCurl(false)}
            >
              <Clipboard size={17} />
              Tách dữ liệu
            </Button>
            <Button
              disabled={!curlText.trim() || testMutation.isPending}
              onClick={() => handleParseCurl(true)}
            >
              <Play size={17} />
              Tách & test API
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Server size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Thông tin gọi API
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cookie đã lưu trong database sẽ được dùng tự động. Có thể nhập
                cookie tạm thời để override khi test.
              </p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <AlertTriangle size={14} />
            Chỉ test API
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-12">
          <div className="space-y-1.5 lg:col-span-7">
            <Label htmlFor="yunatt-endpoint">Endpoint</Label>
            <Input
              id="yunatt-endpoint"
              value={endpointValue}
              onChange={(event) => updateField("endpoint", event.target.value)}
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="yunatt-month-data-id">Tháng máy chấm công</Label>
            {monthMappingOptions.length > 0 ? (
              <select
                className="h-11 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm font-semibold text-foreground shadow-[var(--field-shadow)] outline-none transition hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15"
                id="yunatt-month-data-id"
                value={activeMonthDataId}
                onChange={(event) => updateField("monthDataId", event.target.value)}
              >
                {monthMappingOptions.map((mapping) => (
                  <option key={mapping.period} value={mapping.monthDataId}>
                    {formatPeriodLabel(mapping.period)} - {mapping.monthDataId}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="yunatt-month-data-id"
                placeholder="Chưa cấu hình, nhập tạm monthDataId"
                value={form.monthDataId}
                onChange={(event) => updateField("monthDataId", event.target.value)}
              />
            )}
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="yunatt-offset">Offset</Label>
            <Input
              id="yunatt-offset"
              min={0}
              type="number"
              value={form.offset}
              onChange={(event) =>
                updateField("offset", Number(event.target.value))
              }
            />
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="yunatt-limit">Limit</Label>
            <Input
              id="yunatt-limit"
              max={200}
              min={1}
              type="number"
              value={form.limit}
              onChange={(event) =>
                updateField("limit", Number(event.target.value))
              }
            />
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label htmlFor="yunatt-order">Order</Label>
            <select
              className="h-11 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm font-medium text-foreground shadow-[var(--field-shadow)] outline-none transition hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15"
              id="yunatt-order"
              value={form.order}
              onChange={(event) =>
                updateField(
                  "order",
                  event.target.value as AttendanceServerSyncTestInput["order"],
                )
              }
            >
              <option value="asc">asc</option>
              <option value="desc">desc</option>
            </select>
          </div>

          <div className="space-y-1.5 lg:col-span-8">
            <Label htmlFor="yunatt-cookie">Cookie phiên đăng nhập</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm font-medium text-foreground shadow-[var(--field-shadow)] outline-none transition placeholder:text-[var(--field-placeholder)] hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15"
              id="yunatt-cookie"
              placeholder="JSESSIONID=...; AUTOLOTIN=...; VI=1"
              value={form.cookie ?? ""}
              onChange={(event) => updateField("cookie", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Để lưu cookie dùng chung, vào màn hình Cấu hình máy chấm công. Ô
              này chỉ override cho lần test hiện tại.
            </p>
          </div>
          <div className="space-y-1.5 lg:col-span-4">
            <Label htmlFor="yunatt-search">Search</Label>
            <Input
              id="yunatt-search"
              placeholder="Mã hoặc tên nhân viên"
              value={form.search}
              onChange={(event) => updateField("search", event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button
            disabled={testMutation.isPending}
            variant="secondary"
            onClick={handleReset}
          >
            <RotateCcw size={17} />
            Reset form
          </Button>
          <Button disabled={testMutation.isPending} onClick={handleSubmit}>
            <Play size={17} />
            {testMutation.isPending ? "Đang test..." : "Test API"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-orange-200 bg-orange-50 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-orange-200 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
              <Database size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-orange-950">
                Nhập thử từ body admin
              </h2>
              <p className="mt-1 text-sm font-medium text-orange-800">
                Paste JSON response `{` total, rows `}` từ Yunatt hoặc dùng body test vừa lấy. Chỉ khớp theo mã máy chấm công đã gán, không khớp theo tên.
              </p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-300 bg-white px-3 py-1 text-xs font-bold text-orange-700">
            Ghi vào bảng chấm công
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-12">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="admin-body-month">Tháng công</Label>
            <Input
              id="admin-body-month"
              max={12}
              min={1}
              type="number"
              value={importPeriod.month}
              onChange={(event) =>
                setImportPeriod((current) => ({
                  ...current,
                  month: Math.min(12, Math.max(1, Number(event.target.value) || current.month)),
                }))
              }
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="admin-body-year">Năm công</Label>
            <Input
              id="admin-body-year"
              min={2000}
              type="number"
              value={importPeriod.year}
              onChange={(event) =>
                setImportPeriod((current) => ({
                  ...current,
                  year: Number(event.target.value) || current.year,
                }))
              }
            />
          </div>
          <div className="flex items-end justify-end gap-2 lg:col-span-8">
            <Button
              disabled={!result || importBodyMutation.isPending}
              variant="secondary"
              onClick={handleUseResultBody}
            >
              <Braces size={17} />
              Dùng body test vừa lấy
            </Button>
            <Button
              disabled={!adminBodyText.trim() || importBodyMutation.isPending}
              onClick={handleImportAdminBody}
            >
              <Save size={17} />
              {importBodyMutation.isPending ? "Đang nhập..." : "Nhập vào chấm công"}
            </Button>
          </div>
          <div className="space-y-1.5 lg:col-span-12">
            <Label htmlFor="admin-body-json">Body JSON từ admin</Label>
            <textarea
              className="min-h-52 w-full rounded-md border border-orange-300 bg-white px-3 py-2 font-mono text-xs font-medium text-foreground shadow-sm outline-none transition placeholder:text-orange-700/50 hover:border-orange-400 focus:border-orange-600 focus:ring-4 focus:ring-orange-200"
              id="admin-body-json"
              placeholder='{"total":25,"rows":[{"staffNumber":"2","staffName":"Chu Đức Anh","day-2026-04-01":"07:35<br>11:31<br>13:37<br>17:32"}]}'
              value={adminBodyText}
              onChange={(event) => setAdminBodyText(event.target.value)}
            />
          </div>
        </div>
      </section>

      {testMutation.isPending ? (
        <LoadingState label="Đang gọi API máy chấm công..." />
      ) : null}

      {result ? (
        <section className="rounded-lg border border-border bg-card shadow-sm">
          <div className="grid border-b border-border md:grid-cols-4">
            <Metric
              icon={<Database size={18} />}
              label="Tổng dòng server"
              value={result.total.toLocaleString("vi-VN")}
            />
            <Metric
              label="Dòng đã lấy"
              value={result.fetchedRows.toLocaleString("vi-VN")}
            />
            <Metric
              label="Ngày có dữ liệu"
              value={result.dates.length.toLocaleString("vi-VN")}
            />
            <Metric
              label="Lượt chấm công"
              value={totalPunches.toLocaleString("vi-VN")}
            />
          </div>

          <div className="border-b border-border p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Braces size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">
                  Preview response
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bảng dưới đã chuyển các trường `day-YYYY-MM-DD` thành từng
                  ngày và tách giờ từ chuỗi `&lt;br&gt;`.
                </p>
              </div>
            </div>
          </div>

          {result.rows.length > 0 ? (
            <div className="overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-sky-50 text-left text-xs font-semibold uppercase text-sky-950">
                    <th className="sticky left-0 z-20 w-24 whitespace-nowrap border-b border-r border-border bg-sky-50 px-3 py-3">
                      Mã
                    </th>
                    <th className="sticky left-24 z-20 min-w-48 whitespace-nowrap border-b border-r border-border bg-sky-50 px-3 py-3">
                      Nhân viên
                    </th>
                    <th className="whitespace-nowrap border-b border-r border-border px-3 py-3 text-right">
                      Số ngày
                    </th>
                    <th className="whitespace-nowrap border-b border-r border-border px-3 py-3 text-right">
                      Lượt
                    </th>
                    {result.dates.map((date) => (
                      <th
                        className="min-w-32 whitespace-nowrap border-b border-r border-border px-3 py-3 text-center"
                        key={date}
                      >
                        {formatDateLabel(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr
                      className="group transition-colors hover:bg-amber-50"
                      key={`${row.staffNumber}-${row.staffName}`}
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-border bg-card px-3 py-3 font-medium text-foreground group-hover:bg-amber-50">
                        {row.staffNumber || "-"}
                      </td>
                      <td className="sticky left-24 z-10 whitespace-nowrap border-b border-r border-border bg-card px-3 py-3 font-medium text-foreground group-hover:bg-amber-50">
                        {row.staffName || "-"}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-3 text-right font-medium">
                        {row.presentDays}
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-3 text-right font-medium">
                        {row.punchCount}
                      </td>
                      {result.dates.map((date) => (
                        <td
                          className="border-b border-r border-border px-2 py-2 align-top"
                          key={date}
                        >
                          <div className="flex min-h-10 flex-wrap justify-center gap-1">
                            {(row.days[date] ?? []).map((time, index) => (
                              <span
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                                key={`${time}-${index}`}
                              >
                                {time}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                description="API trả về 0 dòng trong page hiện tại."
                title="Không có dữ liệu preview"
              />
            </div>
          )}

          <details className="border-t border-border p-5">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Xem raw rows
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
              {JSON.stringify(result.rawRows, null, 2)}
            </pre>
          </details>
        </section>
      ) : (
        <section
          className={cn(
            "rounded-lg border border-dashed border-border bg-card p-8",
            testMutation.isPending && "hidden",
          )}
        >
          <EmptyState
            description="Lưu cookie máy chấm công, chọn tháng máy chấm công rồi bấm Test API."
            title="Chưa có dữ liệu test"
          />
        </section>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border p-5 md:border-b-0 md:border-r last:md:border-r-0">
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatDateLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function normalizeServerMonthMappings(settings?: AttendanceServerSettings) {
  const deduped = new Map<string, string>();
  for (const mapping of settings?.autoSyncMonthMappings ?? []) {
    const period = mapping.period.trim();
    const monthDataId = mapping.monthDataId.trim();
    if (/^\d{4}-\d{2}$/.test(period) && monthDataId) {
      deduped.set(period, monthDataId);
    }
  }

  const legacyMonthDataId = settings?.autoSyncMonthDataId.trim();
  if (deduped.size === 0 && legacyMonthDataId) {
    deduped.set(getCurrentPeriod(), legacyMonthDataId);
  }

  return Array.from(deduped.entries())
    .map(([period, monthDataId]) => ({ period, monthDataId }))
    .sort((left, right) => right.period.localeCompare(left.period));
}

function getActiveMonthDataId(
  monthDataId: string,
  mappings: Array<{ period: string; monthDataId: string }>,
) {
  const normalizedMonthDataId = monthDataId.trim();
  if (mappings.length === 0 || mappings.some((mapping) => mapping.monthDataId === normalizedMonthDataId)) {
    return normalizedMonthDataId;
  }

  const currentPeriod = getCurrentPeriod();
  return (
    mappings.find((mapping) => mapping.period === currentPeriod)?.monthDataId ??
    mappings[0]?.monthDataId ??
    normalizedMonthDataId
  );
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-");
  return month && year ? `${month}/${year}` : period;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseCurlCommand(
  command: string,
): Partial<AttendanceServerSyncTestInput> {
  const nextForm: Partial<AttendanceServerSyncTestInput> = {};
  const parsedCurl = parseCurlRequest(command);
  if (parsedCurl.endpoint) {
    nextForm.endpoint = parsedCurl.endpoint;
  }

  if (parsedCurl.cookie) {
    nextForm.cookie = parsedCurl.cookie;
  }

  if (parsedCurl.payload) {
    const params = new URLSearchParams(parsedCurl.payload);
    const order = params.get("order");
    const offset = Number(params.get("offset"));
    const limit = Number(params.get("limit"));
    const monthDataId = params.get("monthDataId");
    const search = params.get("search");

    if (order === "asc" || order === "desc") {
      nextForm.order = order;
    }
    if (Number.isFinite(offset)) {
      nextForm.offset = offset;
    }
    if (Number.isFinite(limit)) {
      nextForm.limit = limit;
    }
    if (monthDataId !== null) {
      nextForm.monthDataId = monthDataId;
    }
    if (search !== null) {
      nextForm.search = search;
    }
  }

  return nextForm;
}
