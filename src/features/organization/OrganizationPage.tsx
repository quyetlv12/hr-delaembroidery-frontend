import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BriefcaseBusiness, Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { RequirePermission } from "@/components/common/RequirePermission";
import { DataTable } from "@/components/table/DataTable";
import { permissions } from "@/constants/permissions";
import { confirmDelete } from "@/lib/confirm";
import { showApiError, showSuccess } from "@/lib/toast";

import { deleteDepartment, deletePosition, getDepartments, getPositions } from "./organization.service";
import type { Department, Position } from "./organization.types";

export function OrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const departmentsQuery = useQuery({
    queryKey: ["organization", "departments"],
    queryFn: getDepartments,
  });
  const positionsQuery = useQuery({
    queryKey: ["organization", "positions"],
    queryFn: getPositions,
  });

  const departmentDeleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess() {
      showSuccess("Xóa phòng ban thành công");
      invalidateOrganization(queryClient);
    },
    onError(error) {
      showApiError(error);
    },
  });

  const positionDeleteMutation = useMutation({
    mutationFn: deletePosition,
    onSuccess() {
      showSuccess("Xóa chức vụ thành công");
      invalidateOrganization(queryClient);
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleDeleteDepartment = useCallback(
    async (department: Department) => {
      const confirmed = await confirmDelete(department.name);
      if (confirmed) {
        departmentDeleteMutation.mutate(department.id);
      }
    },
    [departmentDeleteMutation],
  );

  const handleDeletePosition = useCallback(
    async (position: Position) => {
      const confirmed = await confirmDelete(position.name);
      if (confirmed) {
        positionDeleteMutation.mutate(position.id);
      }
    },
    [positionDeleteMutation],
  );

  const departmentColumns = useMemo<ColumnDef<Department>[]>(
    () => [
      { header: "Mã phòng ban", accessorKey: "code" },
      { header: "Tên phòng ban", accessorKey: "name" },
      { header: "Mô tả", cell: ({ row }) => row.original.description ?? "-" },
      { header: "Chức vụ", accessorKey: "positionCount" },
      { header: "Nhân viên", accessorKey: "employeeCount" },
      {
        header: "Thao tác",
        cell: ({ row }) => (
          <TableActions
            editLabel={`Sửa ${row.original.name}`}
            deleteLabel={`Xóa ${row.original.name}`}
            onEdit={() => navigate(`/organization/departments/${row.original.id}/edit`)}
            onDelete={() => void handleDeleteDepartment(row.original)}
          />
        ),
      },
    ],
    [handleDeleteDepartment, navigate],
  );

  const positionColumns = useMemo<ColumnDef<Position>[]>(
    () => [
      { header: "Mã chức vụ", accessorKey: "code" },
      { header: "Tên chức vụ", accessorKey: "name" },
      { header: "Phòng ban", cell: ({ row }) => row.original.departmentName ?? "-" },
      { header: "Nhân viên", accessorKey: "employeeCount" },
      {
        header: "Thao tác",
        cell: ({ row }) => (
          <TableActions
            editLabel={`Sửa ${row.original.name}`}
            deleteLabel={`Xóa ${row.original.name}`}
            onEdit={() => navigate(`/organization/positions/${row.original.id}/edit`)}
            onDelete={() => void handleDeletePosition(row.original)}
          />
        ),
      },
    ],
    [handleDeletePosition, navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description="Quản lý danh mục phòng ban và chức vụ dùng trong hồ sơ nhân viên."
        title="Phòng ban & chức vụ"
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Building2 size={18} />
            Phòng ban
          </h2>
          <RequirePermission permission={permissions.employeesCreate}>
            <Button onClick={() => navigate("/organization/departments/new")}>
              <Plus size={18} />
              Thêm phòng ban
            </Button>
          </RequirePermission>
        </div>
        <DataTable
          columns={departmentColumns}
          data={departmentsQuery.data ?? []}
          emptyDescription="Thêm phòng ban để phân nhóm nhân viên và chức vụ."
          emptyTitle="Chưa có phòng ban"
          isError={departmentsQuery.isError}
          isLoading={departmentsQuery.isLoading}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BriefcaseBusiness size={18} />
            Chức vụ
          </h2>
          <RequirePermission permission={permissions.employeesCreate}>
            <Button onClick={() => navigate("/organization/positions/new")}>
              <Plus size={18} />
              Thêm chức vụ
            </Button>
          </RequirePermission>
        </div>
        <DataTable
          columns={positionColumns}
          data={positionsQuery.data ?? []}
          emptyDescription="Thêm chức vụ để gán vào hồ sơ nhân viên."
          emptyTitle="Chưa có chức vụ"
          isError={positionsQuery.isError}
          isLoading={positionsQuery.isLoading}
        />
      </section>
    </div>
  );
}

function TableActions({
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: {
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <RequirePermission permission={permissions.employeesUpdate}>
        <Button aria-label={editLabel} className="h-8 w-8 px-0" variant="ghost" onClick={onEdit}>
          <Pencil size={16} />
        </Button>
      </RequirePermission>
      <RequirePermission permission={permissions.employeesDelete}>
        <Button aria-label={deleteLabel} className="h-8 w-8 px-0" variant="ghost" onClick={onDelete}>
          <Trash2 size={16} />
        </Button>
      </RequirePermission>
    </div>
  );
}

function invalidateOrganization(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["organization"] });
  void queryClient.invalidateQueries({ queryKey: ["employees", "form-options"] });
  void queryClient.invalidateQueries({ queryKey: ["employees"] });
}
