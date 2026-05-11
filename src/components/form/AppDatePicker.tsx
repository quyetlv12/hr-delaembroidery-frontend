import DatePicker from "react-datepicker";
import { vi } from "date-fns/locale";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { FormFieldShell } from "./FormFieldShell";

type AppDatePickerProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  control: Control<T>;
  placeholder?: string;
};

export function AppDatePicker<T extends FieldValues>({
  label,
  name,
  control,
  placeholder,
}: AppDatePickerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldShell label={label} error={fieldState.error?.message}>
          <DatePicker
            calendarClassName="hrm-datepicker"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            dateFormat="dd/MM/yyyy"
            locale={vi}
            popperClassName="hrm-datepicker-popper"
            placeholderText={placeholder}
            selected={parseDateValue(field.value as string | undefined)}
            onChange={(date: Date | null) => field.onChange(date ? formatDateValue(date) : "")}
          />
        </FormFieldShell>
      )}
    />
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
