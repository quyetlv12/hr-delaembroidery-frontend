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
          "min-h-28 w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm font-medium text-foreground shadow-[var(--field-shadow)] outline-none transition-[background-color,border-color,box-shadow] placeholder:text-[var(--field-placeholder)] hover:border-[var(--field-hover)] focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:shadow-none",
          className,
        )}
        {...register(name)}
        {...props}
      />
    </FormFieldShell>
  );
}
