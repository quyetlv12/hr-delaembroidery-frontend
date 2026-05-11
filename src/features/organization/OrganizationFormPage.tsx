import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { AppInput } from "@/components/form/AppInput";
import { AppSelect } from "@/components/form/AppSelect";
import { AppTextarea } from "@/components/form/AppTextarea";
import { showApiError, showSuccess } from "@/lib/toast";

import { organizationFormSchema, type OrganizationFormValues } from "./organization.schema";
import {
  createDepartment,
  createPosition,
  getDepartment,
  getDepartments,
  getPosition,
  updateDepartment,
  updatePosition,
} from "./organization.service";

const defaultValues: OrganizationFormValues = {
  code: "",
  name: "",
  description: "",
  departmentId: "",
};

export function OrganizationFormPage() {
  const { entity, id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDepartment = entity === "departments";
  const isPosition = entity === "positions";
  const isEdit = Boolean(id);
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues,
  });

  const departmentsQuery = useQuery({
    queryKey: ["organization", "departments"],
    queryFn: getDepartments,
    enabled: isPosition,
  });

  const departmentQuery = useQuery({
    queryKey: ["organization", "departments", id],
    queryFn: () => getDepartment(id ?? ""),
    enabled: isDepartment && isEdit,
  });

  const positionQuery = useQuery({
    queryKey: ["organization", "positions", id],
    queryFn: () => getPosition(id ?? ""),
    enabled: isPosition && isEdit,
  });

  useEffect(() => {
    if (isDepartment && departmentQuery.data) {
      form.reset({
        code: departmentQuery.data.code,
        name: departmentQuery.data.name,
        description: departmentQuery.data.description ?? "",
        departmentId: "",
      });
    }

    if (isPosition && positionQuery.data) {
      form.reset({
        code: positionQuery.data.code,
        name: positionQuery.data.name,
        description: "",
        departmentId: positionQuery.data.departmentId ?? "",
      });
    }
  }, [departmentQuery.data, form, isDepartment, isPosition, positionQuery.data]);

  const mutation = useMutation<unknown, Error, OrganizationFormValues>({
    mutationFn: (values: OrganizationFormValues) => {
      if (isDepartment) {
        return isEdit && id ? updateDepartment(id, values) : createDepartment(values);
      }

      return isEdit && id ? updatePosition(id, values) : createPosition(values);
    },
    onSuccess() {
      showSuccess(getSuccessMessage(isDepartment, isEdit));
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      navigate("/organization");
    },
    onError(error) {
      showApiError(error);
    },
  });

  const departmentOptions = useMemo(
    () => (departmentsQuery.data ?? []).map((department) => ({ label: department.name, value: department.id })),
    [departmentsQuery.data],
  );

  if (!isDepartment && !isPosition) {
    return <ErrorState message="Danh mục không hợp lệ." />;
  }

  if (departmentQuery.isLoading || positionQuery.isLoading || departmentsQuery.isLoading) {
    return <LoadingState label="Đang tải dữ liệu danh mục..." />;
  }

  if (departmentQuery.isError || positionQuery.isError || departmentsQuery.isError) {
    return <ErrorState message="Không tải được dữ liệu danh mục." />;
  }

  const title = getPageTitle(isDepartment, isEdit);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button variant="secondary" onClick={() => navigate("/organization")}>
            <ArrowLeft size={18} />
            Quay lại
          </Button>
        }
        description="Cập nhật danh mục dùng trong hồ sơ nhân viên."
        title={title}
      />

      <form className="max-w-2xl space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <AppInput error={form.formState.errors.code} label="Mã" name="code" register={form.register} />
        <AppInput error={form.formState.errors.name} label="Tên" name="name" register={form.register} />
        {isDepartment ? (
          <AppTextarea
            error={form.formState.errors.description}
            label="Mô tả"
            name="description"
            register={form.register}
          />
        ) : (
          <AppSelect
            control={form.control}
            label="Phòng ban"
            name="departmentId"
            options={departmentOptions}
            placeholder="Chọn phòng ban"
          />
        )}

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button variant="secondary" onClick={() => navigate("/organization")}>
            Hủy
          </Button>
          <Button disabled={mutation.isPending} type="submit">
            <Save size={18} />
            {mutation.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function getPageTitle(isDepartment: boolean, isEdit: boolean) {
  if (isDepartment) {
    return isEdit ? "Sửa phòng ban" : "Thêm phòng ban";
  }

  return isEdit ? "Sửa chức vụ" : "Thêm chức vụ";
}

function getSuccessMessage(isDepartment: boolean, isEdit: boolean) {
  if (isDepartment) {
    return isEdit ? "Cập nhật phòng ban thành công" : "Thêm phòng ban thành công";
  }

  return isEdit ? "Cập nhật chức vụ thành công" : "Thêm chức vụ thành công";
}
