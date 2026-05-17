import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldShellProps = {
  label: string;
  error?: string;
  labelClassName?: string;
  children: ReactNode;
};

export function FormFieldShell({ label, error, labelClassName, children }: FormFieldShellProps) {
  return (
    <div className="space-y-2">
      <Label className={cn("text-sm font-semibold text-foreground", labelClassName)}>{label}</Label>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
