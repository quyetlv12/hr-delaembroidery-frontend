import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { FieldError, FieldValues, Path, UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { FormFieldShell } from "./FormFieldShell";

type AppInputProps<T extends FieldValues> = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  labelClassName?: string;
  leftIcon?: ReactNode;
};

export function AppInput<T extends FieldValues>({
  label,
  name,
  register,
  error,
  className,
  labelClassName,
  type,
  leftIcon,
  ...props
}: AppInputProps<T>) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordInput = type === "password";
  const inputType = isPasswordInput && isPasswordVisible ? "text" : type;

  return (
    <FormFieldShell label={label} error={error?.message} labelClassName={labelClassName}>
      <div className="relative">
        {leftIcon ? (
          <div className="absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground pointer-events-none">
            {leftIcon}
          </div>
        ) : null}
        <Input
          className={cn(
            isPasswordInput && "pr-10",
            leftIcon && "pl-10",
            className,
          )}
          type={inputType}
          {...register(name)}
          {...props}
        />
        {isPasswordInput ? (
          <button
            aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={isPasswordVisible}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition hover:text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={props.disabled}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        ) : null}
      </div>
    </FormFieldShell>
  );
}
