import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, MailCheck, Save, Send, Server, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { AppMonthPicker } from "@/components/form/AppMonthPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPayroll, sendPayrollPayslipTestEmail } from "@/features/payroll/payroll.service";
import { showApiError, showSuccess } from "@/lib/toast";

import { getEmailSettings, updateEmailSettings } from "./email-settings.service";
import type { EmailSettingsSource } from "./email-settings.types";

type EmailSettingsForm = {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  mailFrom: string;
};

const defaultForm: EmailSettingsForm = {
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  mailFrom: "",
};

const sourceLabels: Record<EmailSettingsSource, string> = {
  database: "Đang dùng cấu hình admin",
  env: "Đang dùng cấu hình .env",
  none: "Chưa cấu hình",
};

export function EmailSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EmailSettingsForm>(defaultForm);
  const [testEmail, setTestEmail] = useState("");
  const [testPeriodDate, setTestPeriodDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedRecordId, setSelectedRecordId] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["email-settings"],
    queryFn: getEmailSettings,
  });
  const payrollQuery = useQuery({
    queryKey: ["payroll", testPeriodDate.getMonth() + 1, testPeriodDate.getFullYear()],
    queryFn: () => getPayroll(testPeriodDate.getMonth() + 1, testPeriodDate.getFullYear()),
  });

  const mutation = useMutation({
    mutationFn: updateEmailSettings,
    onSuccess(data) {
      showSuccess("Đã lưu cấu hình email");
      setForm(toForm(data));
      void queryClient.invalidateQueries({ queryKey: ["email-settings"] });
    },
    onError(error) {
      showApiError(error);
    },
  });
  const testMutation = useMutation({
    mutationFn: ({ recordId, email }: { recordId: string; email: string }) =>
      sendPayrollPayslipTestEmail(recordId, email),
    onSuccess(data) {
      showSuccess(`Đã gửi phiếu lương test của ${data.employeeName} tới ${data.email}`);
    },
    onError(error) {
      showApiError(error);
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(toForm(settingsQuery.data));
    }
  }, [settingsQuery.data]);
  useEffect(() => {
    const records = payrollQuery.data?.records ?? [];
    if (records.length === 0) {
      setSelectedRecordId("");
      return;
    }

    if (!records.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(records[0].id);
    }
  }, [payrollQuery.data?.records, selectedRecordId]);

  const updateField = <K extends keyof EmailSettingsForm>(field: K, value: EmailSettingsForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      smtpHost: form.smtpHost.trim(),
      smtpPort: Number(form.smtpPort) || 587,
      smtpUser: form.smtpUser.trim(),
      smtpPass: form.smtpPass,
      mailFrom: form.mailFrom.trim(),
    });
  };
  const handleTestEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    testMutation.mutate({ recordId: selectedRecordId, email: testEmail.trim() });
  };

  if (settingsQuery.isLoading) {
    return <LoadingState label="Đang tải cấu hình email..." />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return <ErrorState message="Không tải được cấu hình email." />;
  }

  const settings = settingsQuery.data;
  const sourceTone = settings.isConfigured ? (settings.source === "database" ? "success" : "warning") : "danger";
  const payrollRecords = payrollQuery.data?.records ?? [];
  const selectedRecord = payrollRecords.find((record) => record.id === selectedRecordId);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Cấu hình SMTP để gửi phiếu lương PDF cho nhân viên. Cấu hình lưu trong admin sẽ ưu tiên hơn biến môi trường."
        title="Cài đặt email"
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={Server}
          label="Nguồn cấu hình"
          value={sourceLabels[settings.source]}
          badge={
            <Badge tone={sourceTone}>
              {settings.isConfigured ? "Sẵn sàng" : "Thiếu SMTP"}
            </Badge>
          }
        />
        <StatusCard
          icon={KeyRound}
          label="Mật khẩu SMTP"
          value={settings.hasPassword ? settings.passwordPreview : "Chưa có mật khẩu"}
          badge={
            <Badge tone={settings.hasPassword ? "success" : "warning"}>
              {settings.hasPassword ? "Đã lưu" : "Trống"}
            </Badge>
          }
        />
        <StatusCard
          icon={ShieldCheck}
          label="Cập nhật gần nhất"
          value={formatUpdatedAt(settings.updatedAt)}
          description={settings.updatedByLoginCode ? `Bởi ${settings.updatedByLoginCode}` : "Chưa lưu từ admin"}
        />
      </section>

      <form className="rounded-lg border border-border bg-card shadow-sm" onSubmit={handleSubmit}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">SMTP gửi phiếu lương</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dùng cho nút gửi bảng lương qua email. Để trống mật khẩu nếu muốn giữ mật khẩu hiện tại.
            </p>
          </div>
          <Button disabled={mutation.isPending} type="submit">
            <Save className="size-4" />
            {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>

        <div className="grid gap-4 px-4 py-5 md:grid-cols-2 md:px-5 xl:grid-cols-3">
          <Field label="SMTP host">
            <Input
              autoComplete="off"
              onChange={(event) => updateField("smtpHost", event.target.value)}
              placeholder="smtp.gmail.com"
              value={form.smtpHost}
            />
          </Field>
          <Field label="SMTP port">
            <Input
              min={1}
              max={65535}
              onChange={(event) => updateField("smtpPort", event.target.value)}
              placeholder="587"
              type="number"
              value={form.smtpPort}
            />
          </Field>
          <Field label="Mail from">
            <Input
              autoComplete="off"
              onChange={(event) => updateField("mailFrom", event.target.value)}
              placeholder="Dela HR <hr@delaembroidery.net>"
              value={form.mailFrom}
            />
          </Field>
          <Field label="SMTP user">
            <Input
              autoComplete="username"
              onChange={(event) => updateField("smtpUser", event.target.value)}
              placeholder="user@example.com"
              value={form.smtpUser}
            />
          </Field>
          <Field className="xl:col-span-2" label="SMTP password">
            <Input
              autoComplete="new-password"
              onChange={(event) => updateField("smtpPass", event.target.value)}
              placeholder={settings.hasPassword ? "Để trống để giữ mật khẩu hiện tại" : "Nhập mật khẩu SMTP"}
              type="password"
              value={form.smtpPass}
            />
          </Field>
        </div>
      </form>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <MailCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Test gửi phiếu lương</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Chọn một bảng lương nhân viên và gửi PDF tới email test, không gửi tới email nhân viên.
              </p>
            </div>
          </div>
          <Badge tone={settings.isConfigured ? "success" : "danger"}>
            {settings.isConfigured ? "Có thể test" : "Chưa có SMTP"}
          </Badge>
        </div>

        <form className="grid gap-4 px-4 py-5 md:grid-cols-2 md:px-5 xl:grid-cols-[220px_minmax(320px,1fr)_minmax(280px,1fr)_auto]" onSubmit={handleTestEmail}>
          <AppMonthPicker label="Kỳ lương test" value={testPeriodDate} onChange={setTestPeriodDate} />
          <Field label="Bảng lương nhân viên">
            <select
              className="h-11 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-medium text-foreground shadow-[var(--field-shadow)] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground"
              disabled={payrollQuery.isLoading || payrollRecords.length === 0}
              value={selectedRecordId}
              onChange={(event) => setSelectedRecordId(event.target.value)}
            >
              {payrollQuery.isLoading ? <option value="">Đang tải bảng lương...</option> : null}
              {!payrollQuery.isLoading && payrollRecords.length === 0 ? (
                <option value="">Chưa có bảng lương kỳ này</option>
              ) : null}
              {payrollRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.employeeCode} - {record.employeeName} - {formatCurrency(record.netSalary)}
                </option>
              ))}
            </select>
            {selectedRecord ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Email nhân viên: {selectedRecord.email || "chưa có"} · Thực nhận {formatCurrency(selectedRecord.netSalary)}
              </p>
            ) : null}
          </Field>
          <Field label="Email nhận test">
            <Input
              autoComplete="email"
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="admin@delaembroidery.net"
              type="email"
              value={testEmail}
            />
          </Field>
          <div className="flex items-end">
            <Button
              disabled={
                !settings.isConfigured ||
                testMutation.isPending ||
                payrollQuery.isLoading ||
                !selectedRecordId ||
                !testEmail.trim()
              }
              type="submit"
            >
              <Send className="size-4" />
              {testMutation.isPending ? "Đang gửi..." : "Gửi test"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function toForm(settings: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  mailFrom: string;
}): EmailSettingsForm {
  return {
    smtpHost: settings.smtpHost ?? "",
    smtpPort: String(settings.smtpPort || 587),
    smtpUser: settings.smtpUser ?? "",
    smtpPass: "",
    mailFrom: settings.mailFrom ?? "",
  };
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  description,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 truncate text-base font-semibold text-card-foreground">{value}</p>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {badge}
      </div>
    </div>
  );
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
