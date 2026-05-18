import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Banknote, Eye, Gift, Pencil, Plus, TrendingUp, Trash2 } from "lucide-react";
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
import { AppMonthPicker } from "@/components/form/AppMonthPicker";
import { permissions } from "@/constants/permissions";
import { usePermission } from "@/hooks/use-permission";
import { confirmDelete } from "@/lib/confirm";
import { showApiError, showSuccess, showWarning } from "@/lib/toast";

import {
  deleteEmployee,
  getEmployees,
  increaseEmployeeSalaries,
  updateEmployeeMonthlyBonus,
  updateEmployeeSalary,
} from "./employee.service";
import type { Employee, SalaryIncreaseInput } from "./employee.types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

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
  const canUpdateEmployees = usePermission(permissions.employeesUpdate);
  const now = new Date();
  const [periodDate, setPeriodDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [salaryIncreaseEmployee, setSalaryIncreaseEmployee] = useState<Employee | null>(null);
  const month = periodDate.getMonth() + 1;
  const year = periodDate.getFullYear();
  const employeesQueryKey = useMemo(() => ["employees", month, year] as const, [month, year]);
  const employeesQuery = useQuery({
    queryKey: employeesQueryKey,
    queryFn: () => getEmployees({ bonusMonth: month, bonusYear: year }),
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
      queryClient.setQueryData<Employee[]>(employeesQueryKey, (current) =>
        current?.map((item) => (item.id === employee.id ? employee : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError(error) {
      showApiError(error);
    },
  });
  const monthlyBonusMutation = useMutation({
    mutationFn: ({ id, amount, bonusMonth, bonusYear }: { id: string; amount: number; bonusMonth: number; bonusYear: number }) =>
      updateEmployeeMonthlyBonus(id, { month: bonusMonth, year: bonusYear, amount }),
    onSuccess(employee, variables) {
      showSuccess("Đã cập nhật thưởng tháng");
      queryClient.setQueryData<Employee[]>(["employees", variables.bonusMonth, variables.bonusYear], (current) =>
        current?.map((item) => (item.id === employee.id ? employee : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["employee-monthly-bonus-history", employee.id] });
      void queryClient.invalidateQueries({ queryKey: ["payroll", variables.bonusMonth, variables.bonusYear] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
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

  const handleUpdateMonthlyBonus = useCallback(
    (employee: Employee, amount: number, bonusDate: Date) => {
      const bonusMonth = bonusDate.getMonth() + 1;
      const bonusYear = bonusDate.getFullYear();
      const isCurrentPeriod = bonusMonth === month && bonusYear === year;
      if (isCurrentPeriod && Math.abs(amount - Number(employee.monthlyBonus ?? 0)) < 1) {
        return;
      }
      if (!isCurrentPeriod) {
        setPeriodDate(new Date(bonusYear, bonusMonth - 1, 1));
      }
      monthlyBonusMutation.mutate({ id: employee.id, amount, bonusMonth, bonusYear });
    },
    [month, monthlyBonusMutation, year],
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
            key={`${row.original.id}-${row.original.salary}`}
            onSave={(salary) => handleUpdateSalary(row.original, salary)}
          />
        ),
      },
      {
        header: "Thưởng",
        accessorKey: "monthlyBonus",
        cell: ({ row }) => (
          <EditableMonthlyBonusCell
            employee={row.original}
            isEditable={canUpdateEmployees && row.original.status !== "inactive"}
            isSaving={monthlyBonusMutation.isPending}
            key={`${row.original.id}-${row.original.monthlyBonus ?? 0}`}
            periodDate={periodDate}
            onSave={(amount, bonusDate) => handleUpdateMonthlyBonus(row.original, amount, bonusDate)}
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
    [
      canUpdateEmployees,
      handleDeleteEmployee,
      handleUpdateMonthlyBonus,
      handleUpdateSalary,
      monthlyBonusMutation.isPending,
      navigate,
      periodDate,
      salaryMutation.isPending,
    ],
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
      <section className="rounded-lg border border-border bg-card px-4 py-4 shadow-sm md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Gift size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Thưởng theo kỳ</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Nhập thưởng trực tiếp theo từng tháng. Khoản này cộng vào thực nhận, không đổi lương cơ bản.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-56">
            <AppMonthPicker label="Kỳ thưởng" value={periodDate} onChange={setPeriodDate} />
          </div>
        </div>
      </section>
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
    <div className="group/salary relative inline-flex min-w-44 items-center">
      <CurrencyInput
        allowDecimals={false}
        allowNegativeValue={false}
        className="h-10 w-full rounded-lg border border-sky-200 bg-sky-50 px-3 pr-10 text-right font-bold tabular-nums text-sky-800 outline-none shadow-[inset_0_0_0_1px_rgba(186,230,253,0.35)] transition hover:border-sky-300 hover:bg-sky-100/70 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200 disabled:cursor-wait disabled:opacity-70"
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
      <Pencil
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-sky-500 opacity-65 transition group-hover/salary:opacity-100"
        size={14}
      />
    </div>
  );
}

function EditableMonthlyBonusCell({
  employee,
  isEditable,
  isSaving,
  periodDate,
  onSave,
}: {
  employee: Employee;
  isEditable: boolean;
  isSaving: boolean;
  periodDate: Date;
  onSave: (amount: number, bonusDate: Date) => void;
}) {
  const value = Number(employee.monthlyBonus ?? 0);
  const [draftValue, setDraftValue] = useState(value);
  const cancelCommitRef = useRef(false);

  const commit = () => {
    if (cancelCommitRef.current) {
      cancelCommitRef.current = false;
      return;
    }
    if (!Number.isFinite(draftValue) || draftValue < 0) {
      showWarning("Nhập số tiền thưởng hợp lệ.");
      setDraftValue(value);
      return;
    }
    if (Math.abs(draftValue - value) < 1) {
      return;
    }
    onSave(draftValue, periodDate);
  };

  if (!isEditable) {
    return <span className="block min-w-36 text-right font-semibold tabular-nums">{currencyFormatter.format(value)}</span>;
  }

  return (
    <CurrencyInput
      allowDecimals={false}
      allowNegativeValue={false}
      className="h-9 min-w-40 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-right font-semibold tabular-nums text-emerald-700 outline-none transition hover:border-emerald-300 hover:bg-emerald-100/70 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 disabled:cursor-wait disabled:opacity-70"
      decimalSeparator=","
      decimalsLimit={0}
      disabled={isSaving}
      groupSeparator="."
      inputMode="numeric"
      maxLength={15}
      suffix=" đ"
      title="Nhập thưởng rồi nhấn Enter hoặc rời ô để lưu"
      value={draftValue}
      onBlur={commit}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          cancelCommitRef.current = true;
          setDraftValue(value);
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
