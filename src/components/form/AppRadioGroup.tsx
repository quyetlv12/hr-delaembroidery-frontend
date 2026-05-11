import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import type { SelectOption } from "@/types/api.types";

import { FormFieldShell } from "./FormFieldShell";

type AppRadioGroupProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  control: Control<T>;
  options: SelectOption[];
};

export function AppRadioGroup<T extends FieldValues>({
  label,
  name,
  control,
  options,
}: AppRadioGroupProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldShell label={label} error={fieldState.error?.message}>
          <div className="flex flex-wrap gap-3">
            {options.map((option) => (
              <label className="flex items-center gap-2 text-sm text-foreground" key={option.value}>
                <input
                  checked={field.value === option.value}
                  className="h-4 w-4 accent-primary"
                  name={name}
                  type="radio"
                  value={option.value}
                  onChange={() => field.onChange(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </FormFieldShell>
      )}
    />
  );
}
