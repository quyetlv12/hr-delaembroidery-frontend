import DatePicker from "react-datepicker";
import { vi } from "date-fns/locale";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { FormFieldShell } from "./FormFieldShell";

type AppDateRangePickerProps<T extends FieldValues> = {
  label: string;
  startName: Path<T>;
  endName: Path<T>;
  control: Control<T>;
};

export function AppDateRangePicker<T extends FieldValues>({
  label,
  startName,
  endName,
  control,
}: AppDateRangePickerProps<T>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Controller
        control={control}
        name={startName}
        render={({ field, fieldState }) => (
          <FormFieldShell label={`${label} từ`} error={fieldState.error?.message}>
            <DatePicker
              calendarClassName="hrm-datepicker"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              dateFormat="dd/MM/yyyy"
              locale={vi}
              popperClassName="hrm-datepicker-popper"
              selected={parseDateValue(field.value as string | undefined)}
              onChange={(date: Date | null) => field.onChange(date ? formatDateValue(date) : "")}
            />
          </FormFieldShell>
        )}
      />
      <Controller
        control={control}
        name={endName}
        render={({ field, fieldState }) => (
          <FormFieldShell label={`${label} đến`} error={fieldState.error?.message}>
            <DatePicker
              calendarClassName="hrm-datepicker"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              dateFormat="dd/MM/yyyy"
              locale={vi}
              popperClassName="hrm-datepicker-popper"
              selected={parseDateValue(field.value as string | undefined)}
              onChange={(date: Date | null) => field.onChange(date ? formatDateValue(date) : "")}
            />
          </FormFieldShell>
        )}
      />
    </div>
  );
}

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
