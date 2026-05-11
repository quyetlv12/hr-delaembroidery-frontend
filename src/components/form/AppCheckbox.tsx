import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

type AppCheckboxProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  control: Control<T>;
};

export function AppCheckbox<T extends FieldValues>({
  label,
  name,
  control,
}: AppCheckboxProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            checked={Boolean(field.value)}
            className="h-4 w-4 rounded border-border accent-primary"
            type="checkbox"
            onChange={(event) => field.onChange(event.target.checked)}
          />
          {label}
        </label>
      )}
    />
  );
}
