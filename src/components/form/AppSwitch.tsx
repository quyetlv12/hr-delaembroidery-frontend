import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import { cn } from "@/lib/utils";

type AppSwitchProps<T extends FieldValues> = {
  label: string;
  name: Path<T>;
  control: Control<T>;
};

export function AppSwitch<T extends FieldValues>({ label, name, control }: AppSwitchProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const checked = Boolean(field.value);
        return (
          <button
            aria-pressed={checked}
            className="flex items-center gap-3 text-sm font-medium text-foreground"
            type="button"
            onClick={() => field.onChange(!checked)}
          >
            <span
              className={cn(
                "flex h-6 w-11 items-center rounded-full p-1 transition",
                checked ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full bg-white transition",
                  checked ? "translate-x-5" : "translate-x-0",
                )}
              />
            </span>
            {label}
          </button>
        );
      }}
    />
  );
}
