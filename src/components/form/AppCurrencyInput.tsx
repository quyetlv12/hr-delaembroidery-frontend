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
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
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
