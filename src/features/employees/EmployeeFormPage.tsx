import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { AppCurrencyInput } from "@/components/form/AppCurrencyInput";
import { AppDatePicker } from "@/components/form/AppDatePicker";
import { AppInput } from "@/components/form/AppInput";
import { AppSelect } from "@/components/form/AppSelect";
import { AppTextarea } from "@/components/form/AppTextarea";
import { showApiError, showSuccess } from "@/lib/toast";
import type { SelectOption } from "@/types/api.types";

import {
  createEmployee,
  getEmployee,
  getEmployeeFormOptions,
  updateEmployee,
  uploadEmployeeAvatar,
  uploadEmployeeDocuments,
} from "./employee.service";
import { employeeSchema, type EmployeeFormValues } from "./employee.schema";
import { EmployeeAttachmentPanel } from "./components/EmployeeAttachmentPanel";
import { SalaryHistoryPanel } from "./components/SalaryHistoryPanel";

const genderOptions: SelectOption[] = [
  { label: "Nam", value: "male" },
  { label: "Nữ", value: "female" },
  { label: "Khác", value: "other" },
];

const statusOptions: SelectOption[] = [
  { label: "Đang làm", value: "active" },
  { label: "Thử việc", value: "probation" },
  { label: "Ngừng làm", value: "inactive" },
];

const shiftCountOptions: SelectOption[] = [
  { label: "1 ca/ngày", value: "1" },
  { label: "2 ca/ngày", value: "2" },
  { label: "3 ca/ngày", value: "3" },
];

const defaultValues: EmployeeFormValues = {
  employeeCode: "",
  timekeepingCode: "",
  fullName: "",
  gender: "male",
  birthday: "",
  email: "",
  phone: "",
  cccd: "",
  address: "",
  departmentId: "",
  positionId: "",
  joinDate: new Date().toISOString().slice(0, 10),
  contractType: "",
  salary: "",
  shiftCount: "2",
  bankAccount: "",
  bankName: "",
  loginPassword: "",
  taxCode: "",
  insuranceCode: "",
  status: "active",
  avatar: null,
};

export function EmployeeFormPage() {
  const { id } = useParams();
  const employeeId = id?.split("/")[0] ?? "";
  const isEdit = Boolean(employeeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues,
  });

  const optionsQuery = useQuery({
    queryKey: ["employees", "form-options"],
    queryFn: getEmployeeFormOptions,
  });

  const employeeQuery = useQuery({
    queryKey: ["employees", employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!employeeQuery.data) {
      return;
    }

    form.reset({
      employeeCode: employeeQuery.data.employeeCode,
      timekeepingCode: employeeQuery.data.timekeepingCode ?? "",
      fullName: employeeQuery.data.fullName,
      gender: employeeQuery.data.gender,
      birthday: toDateInputValue(employeeQuery.data.birthday),
      email: employeeQuery.data.email,
      phone: employeeQuery.data.phone ?? "",
      cccd: employeeQuery.data.cccd ?? "",
      address: employeeQuery.data.address ?? "",
      departmentId: employeeQuery.data.departmentId ?? "",
      positionId: employeeQuery.data.positionId ?? "",
      joinDate: toDateInputValue(employeeQuery.data.joinDate),
      contractType: employeeQuery.data.contractType ?? "",
      salary: String(employeeQuery.data.salary),
      shiftCount: String(
        employeeQuery.data.shiftCount ?? 2,
      ) as EmployeeFormValues["shiftCount"],
      bankAccount: employeeQuery.data.bankAccount ?? "",
      bankName: employeeQuery.data.bankName ?? "",
      loginPassword: "",
      taxCode: employeeQuery.data.taxCode ?? "",
      insuranceCode: employeeQuery.data.insuranceCode ?? "",
      status: employeeQuery.data.status,
      avatar: null,
    });
  }, [employeeQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      if (isEdit) {
        const updatedEmployee = await updateEmployee(employeeId, values);
        if (avatarFile) {
          await uploadEmployeeAvatar(employeeId, avatarFile);
        }
        if (documentFiles.length > 0) {
          await uploadEmployeeDocuments(employeeId, documentFiles);
        }
        return updatedEmployee;
      }

      const createdEmployee = await createEmployee(values);
      if (avatarFile) {
        await uploadEmployeeAvatar(createdEmployee.id, avatarFile);
      }
      if (documentFiles.length > 0) {
        await uploadEmployeeDocuments(createdEmployee.id, documentFiles);
      }
      return createdEmployee;
    },
    onSuccess() {
      showSuccess(
        isEdit
          ? "Cập nhật nhân viên và hồ sơ thành công"
          : "Thêm nhân viên và hồ sơ thành công",
      );
      setAvatarFile(null);
      setDocumentFiles([]);
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      navigate("/employees");
    },
    onError(error) {
      showApiError(error);
    },
  });

  const formOptions = useMemo(
    () => ({
      departments: optionsQuery.data?.departments ?? [],
      positions: optionsQuery.data?.positions ?? [],
    }),
    [optionsQuery.data],
  );

  if (optionsQuery.isLoading || employeeQuery.isLoading) {
    return <LoadingState label="Đang tải form nhân viên..." />;
  }

  if (optionsQuery.isError || employeeQuery.isError) {
    return <ErrorState message="Không tải được dữ liệu form nhân viên." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button variant="secondary" onClick={() => navigate("/employees")}>
            <ArrowLeft size={18} />
            Quay lại
          </Button>
        }
        description="Quản lý hồ sơ, hợp đồng, lương và tài khoản ngân hàng chính của nhân viên."
        title={isEdit ? "Sửa nhân viên" : "Thêm nhân viên"}
      />

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Hồ sơ</h2>

          <EmployeeAttachmentPanel
            avatarFile={avatarFile}
            documentFiles={documentFiles}
            employeeId={employeeId}
            existingAvatarUrl={employeeQuery.data?.avatarUrl}
            isEdit={isEdit}
            setAvatarFile={setAvatarFile}
            setDocumentFiles={setDocumentFiles}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AppInput
              error={form.formState.errors.employeeCode}
              label="Mã nhân viên"
              name="employeeCode"
              register={form.register}
            />
            <AppInput
              error={form.formState.errors.timekeepingCode}
              label="Mã máy chấm công"
              name="timekeepingCode"
              register={form.register}
            />
            <AppInput
              error={form.formState.errors.fullName}
              label="Họ tên"
              name="fullName"
              register={form.register}
            />
            <AppSelect
              control={form.control}
              label="Giới tính"
              name="gender"
              options={genderOptions}
            />
            <AppDatePicker
              control={form.control}
              label="Ngày sinh"
              name="birthday"
              placeholder="Chọn ngày sinh"
            />
            <AppInput
              error={form.formState.errors.email}
              label="Email"
              name="email"
              register={form.register}
              type="email"
            />
            <AppInput
              error={form.formState.errors.phone}
              label="Số điện thoại"
              name="phone"
              register={form.register}
            />
            <AppInput
              error={form.formState.errors.cccd}
              label="CCCD"
              name="cccd"
              register={form.register}
            />
            <AppSelect
              control={form.control}
              label="Trạng thái"
              name="status"
              options={statusOptions}
            />
            <div className="md:col-span-2 xl:col-span-3">
              <AppTextarea
                error={form.formState.errors.address}
                label="Địa chỉ"
                name="address"
                register={form.register}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Công việc & lương
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AppSelect
              control={form.control}
              label="Phòng ban"
              name="departmentId"
              options={formOptions.departments}
              placeholder="Chọn phòng ban"
            />
            <AppSelect
              control={form.control}
              label="Chức vụ"
              name="positionId"
              options={formOptions.positions}
              placeholder="Chọn chức vụ"
            />
            <AppDatePicker
              control={form.control}
              label="Ngày vào làm"
              name="joinDate"
              placeholder="Chọn ngày vào làm"
            />
            <AppInput
              error={form.formState.errors.contractType}
              label="Loại hợp đồng"
              name="contractType"
              register={form.register}
            />
            <AppCurrencyInput
              control={form.control}
              label="Lương cơ bản"
              name="salary"
            />
            <AppSelect
              control={form.control}
              label="Số ca/ngày"
              name="shiftCount"
              options={shiftCountOptions}
            />
            <AppInput
              error={form.formState.errors.taxCode}
              label="Mã số thuế"
              name="taxCode"
              register={form.register}
            />
            <AppInput
              error={form.formState.errors.insuranceCode}
              label="Mã bảo hiểm"
              name="insuranceCode"
              register={form.register}
            />
          </div>
          {isEdit ? <SalaryHistoryPanel employeeId={employeeId} /> : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Tài khoản ngân hàng
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AppInput
              error={form.formState.errors.bankName}
              label="Tên ngân hàng"
              name="bankName"
              register={form.register}
            />
            <AppInput
              error={form.formState.errors.bankAccount}
              label="Số tài khoản"
              name="bankAccount"
              register={form.register}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Tài khoản đăng nhập
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AppInput
              autoComplete="new-password"
              error={form.formState.errors.loginPassword}
              label={isEdit ? "Mật khẩu đăng nhập mới" : "Mật khẩu đăng nhập"}
              name="loginPassword"
              placeholder={
                isEdit
                  ? "Để trống nếu không đổi mật khẩu"
                  : "Để trống để dùng 123456789"
              }
              register={form.register}
              type="password"
            />
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button variant="secondary" onClick={() => navigate("/employees")}>
            Hủy
          </Button>
          <Button disabled={mutation.isPending} type="submit">
            <Save size={18} />
            {mutation.isPending ? "Đang lưu..." : "Lưu nhân viên"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function toDateInputValue(value?: string) {
  return value ? value.slice(0, 10) : "";
}
