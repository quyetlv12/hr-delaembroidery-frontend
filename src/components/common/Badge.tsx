import type { ComponentProps } from "react";

import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

type BadgeProps = ComponentProps<"span"> & {
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  success: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-200",
};

export function Badge({ className, tone = "neutral", children, ...props }: BadgeProps) {
  return (
    <ShadcnBadge
      className={cn(toneStyles[tone], className)}
      {...props}
    >
      {children}
    </ShadcnBadge>
  );
}
