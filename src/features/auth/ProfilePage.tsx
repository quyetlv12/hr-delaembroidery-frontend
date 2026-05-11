import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { AppInput } from "@/components/form/AppInput";
import { showApiError, showSuccess } from "@/lib/toast";

import { changePassword, getProfile } from "./auth.service";
import { changePasswordSchema, type ChangePasswordFormValues } from "./profile.schema";
import { useAuth } from "./use-auth";

const defaultValues: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ProfilePage() {
  const { session, setSession } = useAuth();
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues,
  });
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess() {
      form.reset(defaultValues);
      showSuccess("Đổi mật khẩu thành công");
    },
    onError(error) {
      showApiError(error);
    },
  });

  const profile = profileQuery.data ?? session?.user;

  useEffect(() => {
    if (
      session &&
      profileQuery.data &&
      (session.user.loginCode !== profileQuery.data.loginCode ||
        session.user.email !== profileQuery.data.email ||
        session.user.fullName !== profileQuery.data.fullName ||
        session.user.employeeId !== profileQuery.data.employeeId)
    ) {
      setSession({ ...session, user: profileQuery.data });
    }
  }, [profileQuery.data, session, setSession]);

  if (profileQuery.isLoading && !profile) {
    return <LoadingState label="Đang tải hồ sơ cá nhân..." />;
  }

  if (profileQuery.isError || !profile) {
    return <ErrorState message="Không tải được hồ sơ cá nhân." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Xem thông tin tài khoản đang đăng nhập và cập nhật mật khẩu bảo mật."
        title="Hồ sơ cá nhân"
      />

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-5 md:px-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-xl font-semibold text-primary">
            {profile.fullName.slice(0, 1).toLocaleUpperCase("vi-VN")}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">{profile.fullName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.loginCode} · {profile.email}
            </p>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-3">
          <ProfileMetric icon={UserRound} label="Mã đăng nhập" value={profile.loginCode} />
          <ProfileMetric icon={ShieldCheck} label="Vai trò" value={profile.roles.map((role) => role.name).join(", ")} />
          <ProfileMetric icon={KeyRound} label="Bảo mật" value="Đổi mật khẩu định kỳ" />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-4 md:px-5">
          <h2 className="text-base font-semibold text-card-foreground">Đổi mật khẩu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhập mật khẩu hiện tại trước khi đặt mật khẩu mới.
          </p>
        </div>

        <form
          className="grid gap-4 px-4 py-5 md:grid-cols-3 md:px-5"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <AppInput
            autoComplete="current-password"
            error={form.formState.errors.currentPassword}
            label="Mật khẩu hiện tại"
            name="currentPassword"
            register={form.register}
            type="password"
          />
          <AppInput
            autoComplete="new-password"
            error={form.formState.errors.newPassword}
            label="Mật khẩu mới"
            name="newPassword"
            register={form.register}
            type="password"
          />
          <AppInput
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword}
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            register={form.register}
            type="password"
          />
          <div className="flex justify-end md:col-span-3">
            <Button disabled={mutation.isPending} type="submit">
              <KeyRound size={18} />
              {mutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProfileMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-base font-semibold text-card-foreground">{value || "-"}</div>
      </div>
    </div>
  );
}
