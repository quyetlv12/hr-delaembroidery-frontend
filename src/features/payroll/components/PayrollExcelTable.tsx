import { useMemo, type ReactNode } from "react";

import { Badge } from "@/components/common/Badge";
import type { PayrollEmployeeViewColumn } from "@/features/employee-view-settings/employee-view-settings.types";
import { cn } from "@/lib/utils";

import { payrollDisplayColumns } from "../payroll-column-metadata";
import type {
  PayrollFormulaSetting,
  PayrollRecordEditableField,
  SalaryRecord,
} from "../payroll.types";
import {
  EditableMoneyCell,
  EditableNumberCell,
  type PayrollCellEditConfig,
} from "./PayrollEditableCells";
import { PayrollFormulaRow } from "./PayrollFormulaRow";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const payrollStatusLabel = { draft: "Nháp", locked: "Đã khóa" } as const;
const payrollRowHoverCellClass =
  "transition-colors group-hover/payroll-row:border-orange-300 group-hover/payroll-row:bg-amber-100/80";

type PayrollExcelTableProps = {
  formulaSetting?: PayrollFormulaSetting;
  isEditable: boolean;
  isSaving: boolean;
  onEditRecord: (
    recordId: string,
    field: PayrollRecordEditableField,
    value: number,
  ) => void;
  records: SalaryRecord[];
  visibleColumns: PayrollEmployeeViewColumn[];
};

type PayrollColumnDefinition = {
  key: PayrollEmployeeViewColumn;
  label: string;
  width: string;
  align?: "left" | "right";
  kind: "text" | "number" | "money" | "status";
  editableField?: PayrollRecordEditableField;
  sign?: "none" | "plus" | "minus";
  tone?: "neutral" | "base" | "positive" | "negative" | "net";
  footer?: "sum" | "label";
};

const payrollColumnDefinitions: PayrollColumnDefinition[] = [
  {
    key: "employeeCode",
    label: "Mã NV",
    width: "min-w-20",
    kind: "text",
    footer: "label",
  },
  { key: "employeeName", label: "Họ và tên", width: "min-w-48", kind: "text" },
  {
    key: "departmentName",
    label: "Phòng ban",
    width: "min-w-36",
    kind: "text",
  },
  { key: "positionName", label: "Chức vụ", width: "min-w-32", kind: "text" },
  {
    key: "insuranceSalary",
    label: "Lương BHXH",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "insuranceSalary",
    footer: "sum",
  },
  {
    key: "configuredSalary",
    label: "Thực hưởng",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "configuredSalary",
    footer: "sum",
  },
  {
    key: "fixedDailySalary",
    label: "Lương cố định",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "fixedDailySalary",
  },
  {
    key: "responsibilityAllowance",
    label: "Trách nhiệm",
    width: "min-w-28",
    kind: "money",
    align: "right",
    editableField: "responsibilityAllowance",
    sign: "plus",
    tone: "positive",
  },
  {
    key: "mealAllowance",
    label: "Ăn ca",
    width: "min-w-52",
    kind: "money",
    align: "right",
    editableField: "mealAllowance",
    sign: "plus",
    tone: "positive",
  },
  {
    key: "phoneAllowance",
    label: "Điện thoại",
    width: "min-w-52",
    kind: "money",
    align: "right",
    editableField: "phoneAllowance",
    sign: "plus",
    tone: "positive",
  },
  {
    key: "kpiAllowance",
    label: "KPI",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "kpiAllowance",
    sign: "plus",
    tone: "positive",
  },
  {
    key: "dailyTotal",
    label: "Tổng cộng",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "dailyTotal",
    tone: "base",
  },
  {
    key: "workDay",
    label: "Số công",
    width: "min-w-28",
    kind: "number",
    align: "right",
    editableField: "workDay",
    footer: "sum",
  },
  {
    key: "overtimeWorkDay",
    label: "Công tăng ca",
    width: "min-w-24",
    kind: "number",
    align: "right",
    editableField: "overtimeWorkDay",
    footer: "sum",
  },
  {
    key: "totalWorkDay",
    label: "Tổng công",
    width: "min-w-28",
    kind: "number",
    align: "right",
    editableField: "totalWorkDay",
    footer: "sum",
  },
  {
    key: "earnedSalary",
    label: "Lương trong tháng",
    width: "min-w-36",
    kind: "money",
    align: "right",
    editableField: "earnedSalary",
    tone: "base",
    footer: "sum",
  },
  {
    key: "overtimeTotal",
    label: "Lương tăng ca",
    width: "min-w-28",
    kind: "money",
    align: "right",
    editableField: "overtimeTotal",
    sign: "plus",
    tone: "positive",
    footer: "sum",
  },
  {
    key: "bonusTotal",
    label: "Thưởng lễ",
    width: "min-w-32",
    kind: "money",
    align: "right",
    sign: "plus",
    tone: "positive",
    footer: "sum",
  },
  {
    key: "grossSalary",
    label: "Tổng lương",
    width: "min-w-36",
    kind: "money",
    align: "right",
    editableField: "grossSalary",
    tone: "base",
    footer: "sum",
  },
  {
    key: "employerInsuranceTotal",
    label: "BHXH công ty",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "employerInsuranceTotal",
    sign: "minus",
    tone: "negative",
    footer: "sum",
  },
  {
    key: "insuranceTotal",
    label: "BHXH NLĐ",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "insuranceTotal",
    sign: "minus",
    tone: "negative",
    footer: "sum",
  },
  {
    key: "taxTotal",
    label: "Thuế TNCN",
    width: "min-w-28",
    kind: "money",
    align: "right",
    editableField: "taxTotal",
    sign: "minus",
    tone: "negative",
    footer: "sum",
  },
  {
    key: "advanceTotal",
    label: "Tạm ứng",
    width: "min-w-28",
    kind: "money",
    align: "right",
    editableField: "advanceTotal",
    sign: "minus",
    tone: "negative",
    footer: "sum",
  },
  {
    key: "deductionTotal",
    label: "Tổng giảm trừ",
    width: "min-w-40",
    kind: "money",
    align: "right",
    editableField: "deductionTotal",
    sign: "minus",
    tone: "negative",
    footer: "sum",
  },
  {
    key: "bonus",
    label: "Thưởng",
    width: "min-w-32",
    kind: "money",
    align: "right",
    editableField: "bonus",
    sign: "plus",
    tone: "positive",
    footer: "sum",
  },
  {
    key: "netSalary",
    label: "Thực nhận",
    width: "min-w-36",
    kind: "money",
    align: "right",
    editableField: "netSalary",
    tone: "net",
    footer: "sum",
  },
  {
    key: "dependentNote",
    label: "Ghi chú NPT",
    width: "min-w-32",
    kind: "text",
  },
  { key: "email", label: "Email", width: "min-w-56", kind: "text" },
  { key: "status", label: "Trạng thái", width: "min-w-24", kind: "status" },
];

const groupDefinitions = [
  {
    label: "Thông tin nhân viên",
    columns: [
      "employeeCode",
      "employeeName",
      "departmentName",
      "positionName",
      "insuranceSalary",
      "configuredSalary",
    ],
  },
  {
    label: "Lương ngày được hưởng",
    columns: [
      "fixedDailySalary",
      "responsibilityAllowance",
      "mealAllowance",
      "phoneAllowance",
      "kpiAllowance",
      "dailyTotal",
    ],
  },
  {
    label: "Ngày công",
    columns: ["workDay", "overtimeWorkDay", "totalWorkDay"],
  },
  {
    label: "Lương được hưởng",
    columns: ["earnedSalary", "overtimeTotal", "bonusTotal", "grossSalary"],
  },
  {
    label: "Bảng tính BHXH",
    columns: ["employerInsuranceTotal", "insuranceTotal"],
  },
  {
    label: "Các khoản giảm trừ",
    columns: ["taxTotal", "advanceTotal", "deductionTotal"],
  },
  { label: "Thưởng", columns: ["bonus"] },
  { label: "Thực nhận", columns: ["netSalary"] },
  { label: "Ghi chú NPT", columns: ["dependentNote"] },
  { label: "Email", columns: ["email"] },
  { label: "Trạng thái", columns: ["status"] },
] satisfies Array<{ label: string; columns: PayrollEmployeeViewColumn[] }>;

export function PayrollExcelTable({
  formulaSetting,
  isEditable,
  isSaving,
  onEditRecord,
  records,
  visibleColumns,
}: PayrollExcelTableProps) {
  const visibleColumnSet = useMemo(
    () => new Set(visibleColumns),
    [visibleColumns],
  );
  const columns = useMemo(
    () =>
      payrollDisplayColumns
        .filter((column) => visibleColumnSet.has(column))
        .map((column) =>
          payrollColumnDefinitions.find(
            (definition) => definition.key === column,
          ),
        )
        .filter((column): column is PayrollColumnDefinition => Boolean(column)),
    [visibleColumnSet],
  );
  const groupedRecords = useMemo(() => groupPayrollRecords(records), [records]);
  const totals = useMemo(() => getPayrollTotals(records), [records]);

  return (
    <section className="w-full max-w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Bảng tính lương theo mẫu Excel
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các số tiền được tính theo danh mục và công thức do admin cài đặt
              trong màn hình công thức lương.
            </p>
          </div>
          <Badge tone={isEditable ? "warning" : "neutral"} className="p-2">
            <span className="text-black">
              {" "}
              {isEditable
                ? "Có thể sửa: Nhập vào ô để sửa"
                : "Kỳ đã khóa: chỉ xem"}
            </span>
          </Badge>
        </div>
      </div>

      <div className="max-h-[72vh] overflow-auto">
        <table className="w-max min-w-full table-auto border-collapse text-left text-[12px]">
          <thead className="sticky top-0 z-20 text-card-foreground">
            <tr className="bg-sky-50 text-center text-[12px] font-semibold uppercase text-sky-950">
              {groupDefinitions.map((group) =>
                renderGroupHeader(group.label, group.columns, visibleColumnSet),
              )}
            </tr>
            <tr className="bg-sky-50 text-[12px] font-semibold text-sky-950">
              {columns.map((column) => (
                <HeaderCell
                  className={cn(
                    column.width,
                    column.align === "right" ? "text-right" : "",
                  )}
                  key={column.key}
                >
                  {column.label}
                </HeaderCell>
              ))}
            </tr>
            <PayrollFormulaRow
              formulaSetting={formulaSetting}
              visibleColumns={visibleColumns}
            />
          </thead>
          <tbody>
            {groupedRecords.map((group, groupIndex) => (
              <PayrollGroupRows
                columns={columns}
                formulaSetting={formulaSetting}
                groupIndex={groupIndex}
                groupName={group.name}
                isEditable={isEditable}
                isSaving={isSaving}
                key={group.name}
                records={group.records}
                visibleColumnCount={columns.length}
                onEditRecord={onEditRecord}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-10 bg-amber-50 font-semibold text-card-foreground">
            <tr>{columns.map((column) => renderFooterCell(column, totals))}</tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function PayrollGroupRows({
  columns,
  formulaSetting,
  groupIndex,
  groupName,
  isEditable,
  isSaving,
  onEditRecord,
  records,
  visibleColumnCount,
}: {
  columns: PayrollColumnDefinition[];
  formulaSetting?: PayrollFormulaSetting;
  groupIndex: number;
  groupName: string;
  isEditable: boolean;
  isSaving: boolean;
  onEditRecord: (
    recordId: string,
    field: PayrollRecordEditableField,
    value: number,
  ) => void;
  records: SalaryRecord[];
  visibleColumnCount: number;
}) {
  return (
    <>
      <tr className="bg-slate-100 text-sm font-semibold text-card-foreground">
        <td
          className="whitespace-nowrap border border-border px-3 py-2"
          colSpan={visibleColumnCount}
        >
          {toRoman(groupIndex + 1)}. Bộ phận {groupName}
        </td>
      </tr>
      {records.map((record) => (
        <tr
          className="group/payroll-row bg-card transition-colors hover:bg-amber-100/80"
          key={record.id}
        >
          {columns.map((column) =>
            renderRecordCell(
              column,
              record,
              {
                field: column.editableField,
                isEditable:
                  isEditable &&
                  record.status !== "locked" &&
                  Boolean(column.editableField),
                isSaving,
                onEditRecord,
                recordId: record.id,
              },
              formulaSetting,
            ),
          )}
        </tr>
      ))}
    </>
  );
}

function renderRecordCell(
  column: PayrollColumnDefinition,
  record: SalaryRecord,
  edit: Omit<PayrollCellEditConfig, "field"> & {
    field?: PayrollRecordEditableField;
  },
  formulaSetting?: PayrollFormulaSetting,
) {
  const value = record[column.key];

  if (column.kind === "status") {
    return (
      <TextTableCell key={column.key}>
        {payrollStatusLabel[record.status]}
      </TextTableCell>
    );
  }

  if (column.kind === "number") {
    return (
      <NumberTableCell
        edit={edit.field ? { ...edit, field: edit.field } : undefined}
        key={column.key}
        value={Number(value ?? 0)}
      />
    );
  }

  if (column.kind === "money") {
    const noAllowanceReset = getNoAllowanceReset(column.key, formulaSetting);
    const moneyEdit = edit.field
      ? {
          ...edit,
          field: edit.field,
          ...(noAllowanceReset ? { noAllowanceReset } : {}),
        }
      : undefined;
    return (
      <MoneyTableCell
        edit={moneyEdit}
        key={column.key}
        sign={column.sign}
        tone={column.tone}
        value={Number(value ?? 0)}
      />
    );
  }

  return (
    <TextTableCell
      className={column.key === "employeeName" ? "font-medium" : undefined}
      key={column.key}
    >
      {String(value || "-")}
    </TextTableCell>
  );
}

function getNoAllowanceReset(
  column: PayrollEmployeeViewColumn,
  formulaSetting?: PayrollFormulaSetting,
) {
  if (column === "mealAllowance") {
    return {
      defaultValue: formulaSetting?.defaultMealAllowance ?? 0,
      label: "Không phụ cấp",
    };
  }
  if (column === "phoneAllowance") {
    return {
      defaultValue: formulaSetting?.defaultPhoneAllowance ?? 0,
      label: "Không phụ cấp",
    };
  }
  return undefined;
}

function renderFooterCell(
  column: PayrollColumnDefinition,
  totals: Record<PayrollEmployeeViewColumn, number>,
) {
  if (column.footer === "label") {
    return <FooterTextCell key={column.key}>TỔNG CỘNG</FooterTextCell>;
  }
  if (column.footer !== "sum") {
    return <FooterTextCell key={column.key} />;
  }
  if (column.kind === "number") {
    return <NumberTableCell key={column.key} value={totals[column.key]} />;
  }
  return (
    <MoneyTableCell
      className={
        column.key === "netSalary" ? "bg-yellow-200 text-slate-950" : undefined
      }
      key={column.key}
      sign={column.sign}
      tone={column.tone}
      value={totals[column.key]}
    />
  );
}

function GroupHeader({
  children,
  colSpan = 1,
}: {
  children: ReactNode;
  colSpan?: number;
}) {
  return (
    <th
      className="whitespace-nowrap border border-border px-3 py-3 text-center align-middle"
      colSpan={colSpan}
    >
      {children}
    </th>
  );
}

function renderGroupHeader(
  label: string,
  columns: PayrollEmployeeViewColumn[],
  visibleColumnSet: Set<PayrollEmployeeViewColumn>,
) {
  const colSpan = columns.filter((column) =>
    visibleColumnSet.has(column),
  ).length;
  return colSpan > 0 ? (
    <GroupHeader colSpan={colSpan} key={label}>
      {label}
    </GroupHeader>
  ) : null;
}

function HeaderCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border border-border px-3 py-3 align-middle",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TextTableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border border-border px-3 py-2.5 text-card-foreground",
        payrollRowHoverCellClass,
        className,
      )}
      title={String(children)}
    >
      {children}
    </td>
  );
}

function FooterTextCell({ children }: { children?: ReactNode }) {
  return (
    <td className="whitespace-nowrap border border-border px-3 py-2">
      {children}
    </td>
  );
}

function NumberTableCell({
  value,
  edit,
}: {
  value: number;
  edit?: PayrollCellEditConfig;
}) {
  if (edit?.isEditable) {
    return <EditableNumberCell edit={edit} value={value} />;
  }

  return (
    <td
      className={cn(
        "whitespace-nowrap border border-border px-3 py-2.5 text-right tabular-nums text-card-foreground",
        payrollRowHoverCellClass,
      )}
    >
      {formatNumber(value)}
    </td>
  );
}

function MoneyTableCell({
  value,
  tone = "neutral",
  sign = "none",
  className,
  edit,
}: {
  value: number;
  tone?: "neutral" | "base" | "positive" | "negative" | "net";
  sign?: "none" | "plus" | "minus";
  className?: string;
  edit?: PayrollCellEditConfig;
}) {
  const cellClassName = cn(
    "whitespace-nowrap border border-border text-right font-semibold tabular-nums",
    edit?.isEditable ? "p-0" : "px-3 py-2.5",
    getMoneyToneClass(tone, value),
    payrollRowHoverCellClass,
    className,
  );

  if (edit?.isEditable) {
    return (
      <EditableMoneyCell
        className={cellClassName}
        edit={edit}
        key={`${edit.recordId}-${edit.field}-${value}`}
        value={value}
      />
    );
  }

  return <td className={cellClassName}>{formatMoney(value, sign)}</td>;
}

function getPayrollTotals(records: SalaryRecord[]) {
  return Object.fromEntries(
    payrollDisplayColumns.map((column) => [
      column,
      sumRecords(records, column as keyof SalaryRecord),
    ]),
  ) as Record<PayrollEmployeeViewColumn, number>;
}

function getMoneyToneClass(
  tone: "neutral" | "base" | "positive" | "negative" | "net",
  value: number,
) {
  if (value === 0) {
    return "bg-muted/40 text-muted-foreground";
  }
  if (tone === "base") {
    return "bg-sky-50 text-sky-700";
  }
  if (tone === "positive") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (tone === "negative") {
    return "bg-rose-50 text-rose-700";
  }
  if (tone === "net") {
    return "bg-teal-50 text-primary";
  }
  return "text-card-foreground";
}

function formatMoney(value: number, sign: "none" | "plus" | "minus" = "none") {
  if (value === 0 || sign === "none") {
    return currencyFormatter.format(value);
  }
  const prefix = sign === "plus" ? "+" : "-";
  return `${prefix}${currencyFormatter.format(Math.abs(value))}`;
}

function groupPayrollRecords(records: SalaryRecord[]) {
  const groups = new Map<string, SalaryRecord[]>();
  for (const record of records) {
    const groupName = record.departmentName || "Chưa phân bộ phận";
    groups.set(groupName, [...(groups.get(groupName) ?? []), record]);
  }
  return Array.from(groups, ([name, groupRecords]) => ({
    name,
    records: groupRecords,
  }));
}

function toRoman(value: number) {
  return (
    ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][value - 1] ??
    String(value)
  );
}

function sumRecords(records: SalaryRecord[], key: keyof SalaryRecord) {
  return records.reduce((total, record) => total + Number(record[key] ?? 0), 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(
    value,
  );
}
