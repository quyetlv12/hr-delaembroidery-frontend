import type { ComponentProps } from "react";

import {
  Button as ShadcnButton,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Application-level Button that maps our domain variants to shadcn button variants.
 * Keeps the same API used across all feature pages.
 */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = Omit<ComponentProps<typeof ShadcnButton>, "variant"> & {
  variant?: ButtonVariant;
};

const variantMap = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
} as const;

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <ShadcnButton
      className={cn(className)}
      type={type}
      variant={variantMap[variant]}
      {...props}
    />
  );
}

export type { ButtonVariant };
