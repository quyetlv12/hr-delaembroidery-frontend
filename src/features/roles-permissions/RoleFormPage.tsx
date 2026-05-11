import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { AppInput } from "@/components/form/AppInput";
import { showApiError, showSuccess } from "@/lib/toast";

import { createRole, getRole, getRoleFormOptions, updateRole } from "./role.service";
import { roleSchema, type RoleFormValues } from "./role.schema";
import type { PermissionOption } from "./role.types";

const defaultValues: RoleFormValues = {
  name: "",
  permissionCodes: [],
};

const moduleLabel: Record<string, string> = {
  dashboard: "Tổng quan",
  employees: "Nhân viên",
  attendance: "Chấm công",
  payroll: "Bảng lương",
  "payslip-email": "Email phiếu lương",
  "bank-transfer": "Chuyển khoản",
  roles: "Vai trò",
  reports: "Báo cáo",
};

const actionLabel: Record<string, string> = {
  read: "Xem",
  create: "Thêm",
  update: "Sửa",
  delete: "Xóa",
  import: "Nhập",
  calculate: "Tính",
  lock: "Khóa",
  send: "Gửi",
  export: "Xuất",
  manage: "Quản lý",
};

export function RoleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues,
  });
  const selectedPermissionCodes =
    useWatch({
      control: form.control,
      name: "permissionCodes",
    }) ?? [];

  const optionsQuery = useQuery({
    queryKey: ["roles-permissions", "form-options"],
    queryFn: getRoleFormOptions,
  });

  const roleQuery = useQuery({
    queryKey: ["roles-permissions", id],
    queryFn: () => getRole(id ?? ""),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!roleQuery.data) {
      return;
    }

    form.reset({
      name: roleQuery.data.name,
      permissionCodes: roleQuery.data.permissions,
    });
  }, [form, roleQuery.data]);

  const mutation = useMutation({
    mutationFn: (values: RoleFormValues) => {
      if (isEdit && id) {
        return updateRole(id, values);
      }

      return createRole(values);
    },
    onSuccess() {
      showSuccess(isEdit ? "Cập nhật vai trò thành công" : "Tạo vai trò thành công");
      void queryClient.invalidateQueries({ queryKey: ["roles-permissions"] });
      navigate("/roles-permissions");
    },
    onError(error) {
      showApiError(error);
    },
  });

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PermissionOption[]>();
    for (const permission of optionsQuery.data?.permissions ?? []) {
      groups.set(permission.module, [...(groups.get(permission.module) ?? []), permission]);
    }
    return Array.from(groups.entries()).map(([module, permissions]) => ({ module, permissions }));
  }, [optionsQuery.data]);

  if (optionsQuery.isLoading || roleQuery.isLoading) {
    return <LoadingState label="Đang tải form vai trò..." />;
  }

  if (optionsQuery.isError || roleQuery.isError) {
    return <ErrorState message="Không tải được dữ liệu form vai trò." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button variant="secondary" onClick={() => navigate("/roles-permissions")}>
            <ArrowLeft size={18} />
            Quay lại
          </Button>
        }
        description="Tạo vai trò tùy chỉnh và chọn chính xác các nghiệp vụ được phép truy cập."
        title={isEdit ? "Sửa vai trò" : "Tạo vai trò"}
      />

      <form className="space-y-6" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <section className="max-w-xl">
          <AppInput
            error={form.formState.errors.name}
            label="Tên vai trò"
            name="name"
            register={form.register}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Phân quyền</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {groupedPermissions.map((group) => (
              <fieldset className="rounded-md border border-border bg-card p-4" key={group.module}>
                <legend className="px-1 text-sm font-semibold capitalize text-foreground">
                  {moduleLabel[group.module] ?? group.module}
                </legend>
                <div className="mt-3 space-y-2">
                  {group.permissions.map((permission) => {
                    const checked = selectedPermissionCodes.includes(permission.value);
                    return (
                      <label
                        className="flex items-center gap-2 text-sm text-card-foreground"
                        key={permission.value}
                      >
                        <input
                          checked={checked}
                          className="h-4 w-4 rounded border-border accent-primary"
                          type="checkbox"
                          onChange={(event) => {
                            const nextPermissionCodes = event.target.checked
                              ? [...selectedPermissionCodes, permission.value]
                              : selectedPermissionCodes.filter((code) => code !== permission.value);
                            form.setValue("permissionCodes", nextPermissionCodes, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        />
                        <span>{getPermissionLabel(permission)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button variant="secondary" onClick={() => navigate("/roles-permissions")}>
            Hủy
          </Button>
          <Button disabled={mutation.isPending} type="submit">
            <Save size={18} />
            {mutation.isPending ? "Đang lưu..." : "Lưu vai trò"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function getPermissionLabel(permission: PermissionOption) {
  return `${moduleLabel[permission.module] ?? permission.module} - ${actionLabel[permission.action] ?? permission.action}`;
}
