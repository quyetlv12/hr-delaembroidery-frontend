import type { TextareaHTMLAttributes } from "react";
import type { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";

import { cn } from "@/lib/utils";

import { FormFieldShell } from "./FormFieldShell";

type AppTextareaProps<T extends FieldValues> = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
};

export function AppTextarea<T extends FieldValues>({
  label,
  name,
  register,
  error,
  className,
  ...props
}: AppTextareaProps<T>) {
  return (
    <FormFieldShell label={label} error={error?.message}>
      <textarea
        className={cn(
          "min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20",
          className,
        )}
        {...register(name)}
        {...props}
      />
    </FormFieldShell>
  );
}
