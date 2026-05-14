import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

import { deleteRole, getRoles } from "./role.service";
import type { Role } from "./role.types";

export function RolesPermissionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: ["roles-permissions"],
    queryFn: getRoles,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess() {
      showSuccess("Xóa vai trò thành công");
      void queryClient.invalidateQueries({ queryKey: ["roles-permissions"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleDeleteRole = useCallback(
    async (role: Role) => {
      const confirmed = await confirmDelete(role.name);
      if (confirmed) {
        deleteMutation.mutate(role.id);
      }
    },
    [deleteMutation],
  );

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        header: "Vai trò",
        accessorKey: "name",
        cell: ({ row }) => getRoleDisplayName(row.original.name),
      },
      {
        header: "Loại",
        cell: ({ row }) => (
          <Badge tone={row.original.isSystem ? "neutral" : "success"}>
            {row.original.isSystem ? "Hệ thống" : "Tùy chỉnh"}
          </Badge>
        ),
      },
      {
        header: "Quyền",
        cell: ({ row }) => row.original.permissions.length,
      },
      {
        header: "Thao tác",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <RequirePermission permission={permissions.rolesManage}>
              <Button
                aria-label={`Sửa ${row.original.name}`}
                className="h-8 w-8 px-0"
                variant="ghost"
                onClick={() => navigate(`/roles-permissions/${row.original.id}/edit`)}
              >
                <Pencil size={16} />
              </Button>
              <Button
                aria-label={`Xóa ${row.original.name}`}
                className="h-8 w-8 px-0"
                disabled={row.original.isSystem}
                variant="ghost"
                onClick={() => void handleDeleteRole(row.original)}
              >
                <Trash2 size={16} />
              </Button>
            </RequirePermission>
          </div>
        ),
      },
    ],
    [handleDeleteRole, navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <RequirePermission permission={permissions.rolesManage}>
            <Button onClick={() => navigate("/roles-permissions/new")}>
              <Plus size={18} />
              Tạo vai trò
            </Button>
          </RequirePermission>
        }
        description="Quản lý vai trò, phân quyền và các nghiệp vụ nhân sự cần bảo vệ."
        title="Vai trò & phân quyền"
      />
      <DataTable
        columns={columns}
        data={rolesQuery.data ?? []}
        emptyDescription="Tạo vai trò tùy chỉnh và gán quyền cho từng nghiệp vụ nhân sự."
        emptyTitle="Chưa có vai trò"
        isError={rolesQuery.isError}
        isLoading={rolesQuery.isLoading}
      />
    </div>
  );
}

function getRoleDisplayName(name: string) {
  const roleNames: Record<string, string> = {
    Admin: "Quản trị viên",
    "Nhan vien": "Nhân viên",
  };
  return roleNames[name] ?? name;
}
