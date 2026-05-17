import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  History,
  Search,
  TrendingUp,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getEmployeeSalaryHistories } from "./employee.service";
import type { EmployeeSalaryHistory } from "./employee.types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

const sourceLabel: Record<string, string> = {
  form_update: "Sửa hồ sơ",
  manual_update: "Sửa lương trực tiếp",
  salary_increase: "Tăng lương",
};

export function EmployeeSalaryHistoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const salaryHistoryQuery = useQuery({
    queryKey: ["employees", "salary-history"],
    queryFn: getEmployeeSalaryHistories,
  });

  const histories = useMemo(
    () => salaryHistoryQuery.data ?? [],
    [salaryHistoryQuery.data],
  );
  const filteredHistories = useMemo(
    () => filterHistories(histories, search),
    [histories, search],
  );
  const totalIncrease = histories.reduce(
    (total, item) => total + Math.max(item.changeAmount, 0),
    0,
  );
  const touchedEmployeeCount = new Set(
    histories.map((item) => item.employeeId).filter(Boolean),
  ).size;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button variant="secondary" onClick={() => navigate("/employees")}>
            <UserRound size={17} />
            Danh sách nhân viên
          </Button>
        }
        description="Theo dõi toàn bộ lần sửa lương, tăng lương và người thao tác."
        title="Lịch sử tăng lương"
      />

      <section className="grid gap-3 md:grid-cols-3">
        <HistoryMetric
          icon={<History size={18} />}
          label="Lượt thay đổi"
          value={numberFormatter.format(histories.length)}
        />
        <HistoryMetric
          icon={<UserRound size={18} />}
          label="Nhân viên đã thay đổi"
          value={numberFormatter.format(touchedEmployeeCount)}
        />
        <HistoryMetric
          icon={<Banknote size={18} />}
          label="Tổng tiền tăng"
          value={formatCurrency(totalIncrease)}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Danh sách lịch sử
            </h2>
            <p className="text-sm text-muted-foreground">
              Có thể tìm theo mã nhân viên, tên nhân viên, phòng ban hoặc người
              thao tác.
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={17}
            />
            <Input
              className="pl-9"
              placeholder="Tìm lịch sử tăng lương..."
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </div>
        </div>

        {salaryHistoryQuery.isLoading ? (
          <LoadingState label="Đang tải lịch sử tăng lương..." />
        ) : null}
        {salaryHistoryQuery.isError ? <ErrorState /> : null}
        {!salaryHistoryQuery.isLoading &&
        !salaryHistoryQuery.isError &&
        filteredHistories.length === 0 ? (
          <EmptyState
            description={
              search
                ? "Không có bản ghi khớp với từ khóa đang tìm."
                : "Chưa có lần tăng hoặc sửa lương nào."
            }
            title="Chưa có lịch sử"
          />
        ) : null}
        {!salaryHistoryQuery.isLoading &&
        !salaryHistoryQuery.isError &&
        filteredHistories.length > 0 ? (
          <Table className="min-w-[1180px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Mã NV</TableHead>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead className="text-right">Lương cũ</TableHead>
                <TableHead className="text-right">Lương mới</TableHead>
                <TableHead className="text-right">Chênh lệch</TableHead>
                <TableHead>Cách thay đổi</TableHead>
                <TableHead>Nguồn</TableHead>
                <TableHead>Người thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistories.map((item) => (
                <SalaryHistoryRow
                  item={item}
                  key={item.id}
                  onOpenEmployee={() => {
                    if (item.employeeId) {
                      navigate(`/employees/${item.employeeId}`);
                    }
                  }}
                />
              ))}
            </TableBody>
          </Table>
        ) : null}
      </section>
    </div>
  );
}

function HistoryMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold text-card-foreground">{value}</p>
      </div>
    </div>
  );
}

function SalaryHistoryRow({
  item,
  onOpenEmployee,
}: {
  item: EmployeeSalaryHistory;
  onOpenEmployee: () => void;
}) {
  const isIncrease = item.changeAmount >= 0;
  return (
    <TableRow className="hover:bg-orange-50/80">
      <TableCell className="font-medium text-foreground">
        {formatDateTime(item.createdAt)}
      </TableCell>
      <TableCell>{item.employeeCode ?? "-"}</TableCell>
      <TableCell>
        <button
          className="group flex max-w-72 flex-col text-left"
          disabled={!item.employeeId}
          type="button"
          onClick={onOpenEmployee}
        >
          <span className="font-semibold text-card-foreground group-enabled:group-hover:text-primary">
            {item.employeeName ?? "-"}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.positionName ?? "Chưa có chức vụ"}
          </span>
        </button>
      </TableCell>
      <TableCell>{item.departmentName ?? "-"}</TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {formatCurrency(item.previousSalary)}
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {formatCurrency(item.newSalary)}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={
            isIncrease
              ? "font-bold text-emerald-700"
              : "font-bold text-destructive"
          }
        >
          {formatSignedCurrency(item.changeAmount)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <ChangeModeBadge item={item} />
          {item.changePercent !== undefined ? (
            <span className="text-xs font-semibold text-muted-foreground">
              {item.changePercent >= 0 ? "+" : ""}
              {numberFormatter.format(item.changePercent)}%
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          tone={item.changeSource === "salary_increase" ? "success" : "neutral"}
        >
          {sourceLabel[item.changeSource] ?? item.changeSource}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <TrendingUp size={15} />
          {item.changedByLoginCode ?? "-"}
        </span>
      </TableCell>
    </TableRow>
  );
}

function ChangeModeBadge({ item }: { item: EmployeeSalaryHistory }) {
  if (item.changeMode === "percent" && item.changeValue !== undefined) {
    return (
      <Badge tone="warning">
        <ArrowRight size={13} />
        {numberFormatter.format(item.changeValue)}%
      </Badge>
    );
  }

  if (item.changeMode === "amount" && item.changeValue !== undefined) {
    return (
      <Badge tone="warning">
        <ArrowRight size={13} />
        {formatCurrency(item.changeValue)}
      </Badge>
    );
  }

  return <Badge tone="neutral">Sửa trực tiếp</Badge>;
}

function filterHistories(items: EmployeeSalaryHistory[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter((item) =>
    [
      item.employeeCode,
      item.employeeName,
      item.departmentName,
      item.positionName,
      sourceLabel[item.changeSource],
      item.changeSource,
      item.changedByLoginCode,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatSignedCurrency(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${currencyFormatter.format(Math.abs(value))}`;
}
