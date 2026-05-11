import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { RequirePermission } from "@/components/common/RequirePermission";
import { DataTable } from "@/components/table/DataTable";
import { permissions } from "@/constants/permissions";
import { confirmDelete } from "@/lib/confirm";
import { showApiError, showSuccess } from "@/lib/toast";

import { deleteEmployee, getEmployees } from "./employee.service";
import type { Employee } from "./employee.types";

const salaryFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployees(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess() {
      showSuccess("Xóa nhân viên thành công");
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleDeleteEmployee = useCallback(
    async (employee: Employee) => {
      const confirmed = await confirmDelete(employee.fullName);
      if (confirmed) {
        deleteMutation.mutate(employee.id);
      }
    },
    [deleteMutation],
  );

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        header: "Mã NV",
        accessorKey: "employeeCode",
      },
      {
        header: "Mã đăng nhập",
        accessorKey: "loginCode",
        cell: ({ row }) => row.original.loginCode ?? "-",
      },
      {
        header: "Họ tên",
        accessorKey: "fullName",
      },
      {
        header: "Phòng ban",
        accessorKey: "department",
        cell: ({ row }) => row.original.department ?? "-",
      },
      {
        header: "Chức vụ",
        accessorKey: "position",
        cell: ({ row }) => row.original.position ?? "-",
      },
      {
        header: "Lương",
        accessorKey: "salary",
        cell: ({ row }) => salaryFormatter.format(row.original.salary),
      },
      {
        header: "Trạng thái",
        accessorKey: "status",
        cell: ({ row }) => <Badge tone={statusTone[row.original.status]}>{statusLabel[row.original.status]}</Badge>,
      },
      {
        header: "Thao tác",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              aria-label={`Xem chi tiết ${row.original.fullName}`}
              className="h-8 w-8 px-0"
              variant="ghost"
              onClick={() => navigate(`/employees/${row.original.id}`)}
            >
              <Eye size={16} />
            </Button>
            <RequirePermission permission={permissions.employeesUpdate}>
              <Button
                aria-label={`Sửa ${row.original.fullName}`}
                className="h-8 w-8 px-0"
                variant="ghost"
                onClick={() => navigate(`/employees/${row.original.id}/edit`)}
              >
                <Pencil size={16} />
              </Button>
            </RequirePermission>
            <RequirePermission permission={permissions.employeesDelete}>
              <Button
                aria-label={`Xóa ${row.original.fullName}`}
                className="h-8 w-8 px-0"
                variant="ghost"
                onClick={() => void handleDeleteEmployee(row.original)}
              >
                <Trash2 size={16} />
              </Button>
            </RequirePermission>
          </div>
        ),
      },
    ],
    [handleDeleteEmployee, navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <RequirePermission permission={permissions.employeesCreate}>
            <Button onClick={() => navigate("/employees/new")}>
              <Plus size={18} />
              Thêm nhân viên
            </Button>
          </RequirePermission>
        }
        description="Quản lý hồ sơ, lương, tài khoản ngân hàng, ảnh đại diện và giấy tờ nhân viên."
        title="Nhân viên"
      />
      <DataTable
        columns={columns}
        data={employeesQuery.data ?? []}
        emptyDescription="Thêm hồ sơ nhân viên mới hoặc nhập từ mẫu Excel chuẩn."
        emptyTitle="Chưa có nhân viên"
        isError={employeesQuery.isError}
        isLoading={employeesQuery.isLoading}
      />
    </div>
  );
}
