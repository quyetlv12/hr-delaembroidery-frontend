import CurrencyInput from "react-currency-input-field";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { FormFieldShell } from "./FormFieldShell";

type AppCurrencyInputProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  control: Control<T>;
  placeholder?: string;
  disabled?: boolean;
  suffix?: string;
};

export function AppCurrencyInput<T extends FieldValues>({
  label,
  name,
  control,
  placeholder,
  disabled,
  suffix = " VND",
}: AppCurrencyInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldShell label={label} error={fieldState.error?.message}>
          <CurrencyInput
            className="h-11 w-full min-w-0 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm font-semibold text-foreground shadow-[var(--field-shadow)] outline-none transition-[background-color,border-color,box-shadow] placeholder:text-[var(--field-placeholder)] hover:border-[var(--field-hover)] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:shadow-none"
            allowDecimals={false}
            allowNegativeValue={false}
            decimalsLimit={0}
            decimalSeparator=","
            disabled={disabled}
            groupSeparator="."
            inputMode="numeric"
            placeholder={placeholder ?? "0 VND"}
            suffix={suffix}
            value={field.value as string | number | undefined}
            onValueChange={(value) => field.onChange(value ?? "")}
          />
        </FormFieldShell>
      )}
    />
  );
}
