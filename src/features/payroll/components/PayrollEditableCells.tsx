import { useRef, useState } from "react";
import CurrencyInput from "react-currency-input-field";

import { cn } from "@/lib/utils";

import type { PayrollRecordEditableField } from "../payroll.types";

const payrollRowHoverCellClass =
  "transition-colors group-hover/payroll-row:border-orange-300 group-hover/payroll-row:bg-amber-100/80";

export type PayrollCellEditConfig = {
  field: PayrollRecordEditableField;
  isEditable: boolean;
  isSaving: boolean;
  noAllowanceReset?: {
    defaultValue: number;
    label: string;
  };
  onEditRecord: (recordId: string, field: PayrollRecordEditableField, value: number) => void;
  recordId: string;
};

export function EditableNumberCell({
  value,
  edit,
}: {
  value: number;
  edit: PayrollCellEditConfig;
}) {
  const formattedValue = formatNumber(value);
  const commit = (input: HTMLInputElement) => {
    const nextValue = parsePayrollInput(input.value);
    if (!Number.isFinite(nextValue) || Math.abs(nextValue - Number(value)) < 0.005) {
      input.value = formattedValue;
      return;
    }
    edit.onEditRecord(edit.recordId, edit.field, nextValue);
  };

  return (
    <td
      className={cn(
        "cursor-text whitespace-nowrap border border-border p-0 text-right tabular-nums text-card-foreground",
        payrollRowHoverCellClass,
      )}
    >
      <input
        className="h-full min-h-10 w-full cursor-text whitespace-nowrap border-0 bg-transparent px-3 py-2.5 text-right font-semibold tabular-nums text-inherit outline-none transition focus:bg-background focus:ring-2 focus:ring-inset focus:ring-ring/30 disabled:cursor-wait disabled:opacity-70"
        defaultValue={formattedValue}
        disabled={edit.isSaving}
        inputMode="decimal"
        key={`${edit.recordId}-${edit.field}-${formattedValue}`}
        title="Sửa rồi nhấn Enter hoặc rời ô để lưu"
        onBlur={(event) => commit(event.currentTarget)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.currentTarget.value = formattedValue;
            event.currentTarget.blur();
          }
        }}
      />
    </td>
  );
}

export function EditableMoneyCell({
  value,
  edit,
  className,
}: {
  value: number;
  edit: PayrollCellEditConfig;
  className?: string;
}) {
  const [draftValue, setDraftValue] = useState(value);
  const cancelCommitRef = useRef(false);

  const commit = () => {
    if (cancelCommitRef.current) {
      cancelCommitRef.current = false;
      setDraftValue(value);
      return;
    }

    if (!Number.isFinite(draftValue) || Math.abs(draftValue - Number(value)) < 0.5) {
      setDraftValue(value);
      return;
    }

    edit.onEditRecord(edit.recordId, edit.field, draftValue);
  };
  const handleNoAllowanceChange = (checked: boolean) => {
    const nextValue = checked ? 0 : (edit.noAllowanceReset?.defaultValue ?? value);
    setDraftValue(nextValue);
    if (Math.abs(nextValue - Number(value)) >= 0.5) {
      edit.onEditRecord(edit.recordId, edit.field, nextValue);
    }
  };

  return (
    <td
      className={cn(
        "cursor-text whitespace-nowrap border border-border p-0 text-right tabular-nums",
        payrollRowHoverCellClass,
        className ?? "text-card-foreground",
      )}
    >
      <div className="flex min-h-10 items-center gap-2 px-2">
        <CurrencyInput
          allowDecimals={false}
          allowNegativeValue={false}
          className="h-full min-h-10 min-w-24 flex-1 cursor-text whitespace-nowrap border-0 bg-transparent py-2.5 text-right font-semibold tabular-nums text-inherit outline-none transition focus:bg-background focus:ring-2 focus:ring-inset focus:ring-ring/30 disabled:cursor-wait disabled:opacity-70"
          decimalSeparator=","
          decimalsLimit={0}
          disabled={edit.isSaving}
          groupSeparator="."
          inputMode="numeric"
          key={`${edit.recordId}-${edit.field}-${value}`}
          maxLength={15}
          suffix=" đ"
          title="Nhập số tiền, nhấn Enter hoặc rời ô để lưu"
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
        {edit.noAllowanceReset ? (
          <label
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"
            title="Tích để không tính phụ cấp cho nhân viên này"
            onMouseDown={() => {
              cancelCommitRef.current = true;
            }}
          >
            <input
              checked={draftValue <= 0}
              className="h-3.5 w-3.5 accent-primary"
              disabled={edit.isSaving}
              type="checkbox"
              onChange={(event) => handleNoAllowanceChange(event.currentTarget.checked)}
            />
            {edit.noAllowanceReset.label}
          </label>
        ) : null}
      </div>
    </td>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
}

function parsePayrollInput(value: string) {
  const normalizedValue = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number(normalizedValue);
}
