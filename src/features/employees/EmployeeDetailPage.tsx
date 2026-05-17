import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  Download,
  FileText,
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
import { showApiError } from "@/lib/toast";

import { downloadEmployeeDocument, getEmployee, getEmployeeAssetUrl, getEmployeeDocuments } from "./employee.service";
import type { Employee, EmployeeDocument } from "./employee.types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN");

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

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
  const documentsQuery = useQuery({
    queryKey: ["employees", employeeId, "documents"],
    queryFn: () => getEmployeeDocuments(employeeId),
    enabled: Boolean(employeeId),
  });
  const documentDownloadMutation = useMutation({
    mutationFn: (employeeDocument: EmployeeDocument) => downloadEmployeeDocument(employeeId, employeeDocument),
    onError(error) {
      showApiError(error);
    },
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

      <DocumentSection
        documents={documentsQuery.data ?? []}
        isError={documentsQuery.isError}
        isLoading={documentsQuery.isLoading}
        isDownloading={documentDownloadMutation.isPending}
        onDownload={(employeeDocument) => documentDownloadMutation.mutate(employeeDocument)}
      />
    </div>
  );
}

function Avatar({ employee }: { employee: Employee }) {
  if (employee.avatarUrl) {
    return (
      <img
        alt={employee.fullName}
        className="h-16 w-16 rounded-lg border border-border object-cover"
        src={getEmployeeAssetUrl(employee.avatarUrl)}
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

function DocumentSection({
  documents,
  isDownloading,
  isError,
  isLoading,
  onDownload,
}: {
  documents: EmployeeDocument[];
  isDownloading: boolean;
  isError: boolean;
  isLoading: boolean;
  onDownload: (employeeDocument: EmployeeDocument) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText size={17} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-card-foreground">File hồ sơ cá nhân</h2>
            <p className="text-sm text-muted-foreground">Hợp đồng, CCCD và các tài liệu đã upload.</p>
          </div>
        </div>
        <Badge tone="neutral">{documents.length} file</Badge>
      </div>

      <div className="p-4 md:p-5">
        {isLoading ? (
          <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            Đang tải danh sách hồ sơ...
          </p>
        ) : null}

        {isError ? (
          <p className="rounded-md border border-dashed border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
            Không tải được danh sách file hồ sơ.
          </p>
        ) : null}

        {!isLoading && !isError && documents.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
            Chưa có file hồ sơ nào.
          </p>
        ) : null}

        {!isLoading && !isError && documents.length > 0 ? (
          <div className="grid gap-2 xl:grid-cols-2">
            {documents.map((employeeDocument) => (
              <DocumentRow
                document={employeeDocument}
                isDownloading={isDownloading}
                key={employeeDocument.id}
                onDownload={() => onDownload(employeeDocument)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DocumentRow({
  document,
  isDownloading,
  onDownload,
}: {
  document: EmployeeDocument;
  isDownloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-3 transition-colors hover:border-primary/30 hover:bg-orange-50/70">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
          <FileText size={17} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{document.originalName}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(document.size)} · {formatDateTime(document.uploadedAt)}
          </p>
        </div>
      </div>
      <Button disabled={isDownloading} size="sm" variant="secondary" onClick={onDownload}>
        <Download size={14} />
        Tải xuống
      </Button>
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

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
