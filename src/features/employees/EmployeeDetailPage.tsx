import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  IdCard,
  Mail,
  Pencil,
  User,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { RequirePermission } from "@/components/common/RequirePermission";
import { permissions } from "@/constants/permissions";

import { getEmployee } from "./employee.service";
import type { Employee } from "./employee.types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN");

const genderLabel = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
} as const;

const statusTone = {
  active: "success",
  inactive: "neutral",
  probation: "warning",
} as const;

const statusLabel = {
  active: "Đang làm",
  inactive: "Ngừng làm",
  probation: "Thử việc",
} as const;

export function EmployeeDetailPage() {
  const { id } = useParams();
  const employeeId = id ?? "";
  const navigate = useNavigate();
  const employeeQuery = useQuery({
    queryKey: ["employees", employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: Boolean(employeeId),
  });

  if (employeeQuery.isLoading) {
    return <LoadingState label="Đang tải chi tiết nhân viên..." />;
  }

  if (employeeQuery.isError || !employeeQuery.data) {
    return <ErrorState message="Không tải được chi tiết nhân viên." />;
  }

  const employee = employeeQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/employees")}>
              <ArrowLeft size={18} />
              Quay lại
            </Button>
            <RequirePermission permission={permissions.employeesUpdate}>
              <Button onClick={() => navigate(`/employees/${employee.id}/edit`)}>
                <Pencil size={18} />
                Sửa nhân viên
              </Button>
            </RequirePermission>
          </>
        }
        description="Xem đầy đủ hồ sơ, thông tin công việc, lương và tài khoản ngân hàng của nhân viên."
        title="Chi tiết nhân viên"
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-5 md:px-5">
          <div className="flex items-center gap-4">
            <Avatar employee={employee} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-card-foreground">{employee.fullName}</h2>
                <Badge tone={statusTone[employee.status]}>{statusLabel[employee.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Mã nhân viên {employee.employeeCode}
                {employee.timekeepingCode ? ` · Mã máy chấm công ${employee.timekeepingCode}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
          <SummaryItem icon={Building2} label="Phòng ban" value={employee.department ?? "-"} />
          <SummaryItem icon={IdCard} label="Chức vụ" value={employee.position ?? "-"} />
          <SummaryItem icon={Banknote} label="Lương cơ bản" value={currencyFormatter.format(employee.salary)} />
          <SummaryItem icon={CalendarDays} label="Số ca làm" value={`${employee.shiftCount} ca/ngày`} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DetailSection icon={User} title="Hồ sơ cá nhân">
          <DetailItem label="Mã đăng nhập" value={employee.loginCode} />
          <DetailItem label="Họ tên" value={employee.fullName} />
          <DetailItem label="Giới tính" value={genderLabel[employee.gender]} />
          <DetailItem label="Ngày sinh" value={formatDate(employee.birthday)} />
          <DetailItem label="CCCD" value={employee.cccd} />
          <DetailItem label="Địa chỉ" value={employee.address} />
        </DetailSection>

        <DetailSection icon={Mail} title="Liên hệ">
          <DetailItem label="Email" value={employee.email} />
          <DetailItem label="Số điện thoại" value={employee.phone} />
        </DetailSection>

        <DetailSection icon={Building2} title="Công việc">
          <DetailItem label="Ngày vào làm" value={formatDate(employee.joinDate)} />
          <DetailItem label="Loại hợp đồng" value={employee.contractType} />
          <DetailItem label="Phòng ban" value={employee.department} />
          <DetailItem label="Chức vụ" value={employee.position} />
          <DetailItem label="Trạng thái" value={statusLabel[employee.status]} />
        </DetailSection>

        <DetailSection icon={WalletCards} title="Ngân hàng và mã lương">
          <DetailItem label="Ngân hàng" value={employee.bankName} />
          <DetailItem label="Số tài khoản" value={employee.bankAccount} />
          <DetailItem label="Mã số thuế" value={employee.taxCode} />
          <DetailItem label="Mã bảo hiểm" value={employee.insuranceCode} />
        </DetailSection>
      </div>
    </div>
  );
}

function Avatar({ employee }: { employee: Employee }) {
  if (employee.avatarUrl) {
    return (
      <img
        alt={employee.fullName}
        className="h-16 w-16 rounded-lg border border-border object-cover"
        src={employee.avatarUrl}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-xl font-semibold text-primary">
      {employee.fullName.trim().slice(0, 1).toLocaleUpperCase("vi-VN")}
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 md:border-r md:last:border-r-0 xl:border-b-0 md:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-base font-semibold text-card-foreground">{value}</div>
      </div>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4 md:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon size={17} />
        </div>
        <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
      </div>
      <dl className="divide-y divide-border">{children}</dl>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[160px_1fr] md:px-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value || "-"}</dd>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}
