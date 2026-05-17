import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Banknote, Eye, Pencil, Plus, TrendingUp, Trash2 } from "lucide-react";
import CurrencyInput from "react-currency-input-field";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { RequirePermission } from "@/components/common/RequirePermission";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/table/DataTable";
import { permissions } from "@/constants/permissions";
import { confirmDelete } from "@/lib/confirm";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import { deleteEmployee, getEmployees, increaseEmployeeSalaries, updateEmployeeSalary } from "./employee.service";
import type { Employee, SalaryIncreaseInput } from "./employee.types";

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
  const [salaryIncreaseEmployee, setSalaryIncreaseEmployee] = useState<Employee | null>(null);
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
  const salaryMutation = useMutation({
    mutationFn: ({ id, salary }: { id: string; salary: number }) => updateEmployeeSalary(id, salary),
    onSuccess(employee) {
      showSuccess("Đã cập nhật lương nhân viên");
      queryClient.setQueryData<Employee[]>(["employees"], (current) =>
        current?.map((item) => (item.id === employee.id ? employee : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });
  const salaryIncreaseMutation = useMutation({
    mutationFn: increaseEmployeeSalaries,
    onSuccess(result) {
      showSuccess(`Đã tăng lương ${result.updated} nhân viên`);
      setSalaryIncreaseEmployee(null);
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });

  const handleUpdateSalary = useCallback(
    (employee: Employee, salary: number) => {
      if (Math.abs(salary - employee.salary) < 1) {
        return;
      }
      salaryMutation.mutate({ id: employee.id, salary });
    },
    [salaryMutation],
  );

  const handleIncreaseSalary = useCallback(
    (values: Omit<SalaryIncreaseInput, "employeeIds">) => {
      if (!salaryIncreaseEmployee) {
        showWarning("Chọn nhân viên cần tăng lương.");
        return;
      }
      if (salaryIncreaseEmployee.status === "inactive") {
        showWarning("Không thể tăng lương cho nhân viên đã ngừng làm.");
        return;
      }
      salaryIncreaseMutation.mutate({
        ...values,
        employeeIds: [salaryIncreaseEmployee.id],
      });
    },
    [salaryIncreaseEmployee, salaryIncreaseMutation],
  );

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
        cell: ({ row }) => (
          <EditableSalaryCell
            employee={row.original}
            isSaving={salaryMutation.isPending}
            onSave={(salary) => handleUpdateSalary(row.original, salary)}
          />
        ),
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
                aria-label={`Tăng lương ${row.original.fullName}`}
                className="h-8 w-8 px-0"
                disabled={row.original.status === "inactive"}
                title={row.original.status === "inactive" ? "Nhân viên đã ngừng làm" : "Tăng lương"}
                variant="ghost"
                onClick={() => setSalaryIncreaseEmployee(row.original)}
              >
                <TrendingUp size={16} />
              </Button>
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
    [handleDeleteEmployee, handleUpdateSalary, navigate, salaryMutation.isPending],
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
      <SalaryIncreaseDialog
        employee={salaryIncreaseEmployee}
        isOpen={Boolean(salaryIncreaseEmployee)}
        isPending={salaryIncreaseMutation.isPending}
        key={salaryIncreaseEmployee?.id ?? "closed"}
        onOpenChange={(open) => {
          if (!open) {
            setSalaryIncreaseEmployee(null);
          }
        }}
        onSubmit={handleIncreaseSalary}
      />
    </div>
  );
}

function EditableSalaryCell({
  employee,
  isSaving,
  onSave,
}: {
  employee: Employee;
  isSaving: boolean;
  onSave: (salary: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(employee.salary);
  const cancelCommitRef = useRef(false);

  const commit = () => {
    if (cancelCommitRef.current) {
      cancelCommitRef.current = false;
      setDraftValue(employee.salary);
      return;
    }
    if (!Number.isFinite(draftValue) || Math.abs(draftValue - employee.salary) < 1) {
      setDraftValue(employee.salary);
      return;
    }
    onSave(draftValue);
  };

  return (
    <CurrencyInput
      allowDecimals={false}
      allowNegativeValue={false}
      className="h-9 min-w-36 rounded-md border border-transparent bg-transparent px-2 text-right font-semibold tabular-nums text-card-foreground outline-none transition hover:border-border hover:bg-muted/40 focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20 disabled:cursor-wait disabled:opacity-70"
      decimalSeparator=","
      decimalsLimit={0}
      disabled={isSaving}
      groupSeparator="."
      inputMode="numeric"
      key={`${employee.id}-${employee.salary}`}
      maxLength={15}
      suffix=" đ"
      title="Sửa lương rồi nhấn Enter hoặc rời ô để lưu"
      value={draftValue}
      onBlur={commit}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          cancelCommitRef.current = true;
          setDraftValue(employee.salary);
          event.currentTarget.blur();
        }
      }}
      onValueChange={(nextValue) => setDraftValue(nextValue ? Number(nextValue) : 0)}
    />
  );
}

function SalaryIncreaseDialog({
  employee,
  isOpen,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  employee: Employee | null;
  isOpen: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Omit<SalaryIncreaseInput, "employeeIds">) => void;
}) {
  const [mode, setMode] = useState<SalaryIncreaseInput["mode"]>("percent");
  const [value, setValue] = useState(0);
  const isPercent = mode === "percent";

  const handleSubmit = () => {
    if (!Number.isFinite(value) || value <= 0) {
      showWarning("Nhập phần trăm hoặc số tiền tăng lương lớn hơn 0.");
      return;
    }
    onSubmit({ mode, value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tăng lương{employee ? ` - ${employee.fullName}` : ""}</DialogTitle>
          <DialogDescription>
            Chỉ áp dụng cho nhân viên được chọn. Kỳ lương đã khóa không bị thay đổi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-lg border px-3 py-3 text-left transition ${
                isPercent ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-border hover:border-primary/40"
              }`}
              type="button"
              onClick={() => {
                setMode("percent");
                setValue(0);
              }}
            >
              <span className="block text-sm font-bold text-foreground">Theo phần trăm</span>
              <span className="mt-1 block text-xs text-muted-foreground">Ví dụ nhập 5 để tăng 5%.</span>
            </button>
            <button
              className={`rounded-lg border px-3 py-3 text-left transition ${
                !isPercent ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-border hover:border-primary/40"
              }`}
              type="button"
              onClick={() => {
                setMode("amount");
                setValue(0);
              }}
            >
              <span className="block text-sm font-bold text-foreground">Theo số tiền</span>
              <span className="mt-1 block text-xs text-muted-foreground">Cộng một khoản cố định vào lương.</span>
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">
              {isPercent ? "Phần trăm tăng" : "Số tiền tăng"}
            </span>
            {isPercent ? (
              <div className="mt-1 flex h-10 items-center rounded-md border border-border bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <input
                  className="h-full min-w-0 flex-1 rounded-md bg-transparent px-3 text-sm font-semibold text-foreground outline-none"
                  inputMode="decimal"
                  min={0}
                  step={0.1}
                  type="number"
                  value={value || ""}
                  onChange={(event) => setValue(Number(event.currentTarget.value))}
                />
                <span className="border-l border-border px-3 text-xs font-semibold text-muted-foreground">%</span>
              </div>
            ) : (
              <CurrencyInput
                allowDecimals={false}
                allowNegativeValue={false}
                className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                decimalSeparator=","
                decimalsLimit={0}
                groupSeparator="."
                inputMode="numeric"
                maxLength={15}
                suffix=" đ"
                value={value}
                onValueChange={(nextValue) => setValue(nextValue ? Number(nextValue) : 0)}
              />
            )}
          </label>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Lương mới sẽ dùng cho bảng lương tạo sau này và các kỳ lương hiện có chưa khóa. Kỳ đã khóa giữ nguyên số liệu.
          </div>

          <div className="flex justify-end gap-2">
            <Button disabled={isPending} variant="secondary" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button disabled={isPending || !employee} onClick={handleSubmit}>
              <Banknote size={16} />
              {isPending ? "Đang tăng..." : "Áp dụng tăng lương"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
