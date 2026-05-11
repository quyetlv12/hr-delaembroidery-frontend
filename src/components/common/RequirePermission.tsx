import type { ReactNode } from "react";

import type { PermissionCode } from "@/constants/permissions";
import { usePermission } from "@/hooks/use-permission";

type RequirePermissionProps = {
  permission: PermissionCode;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const allowed = usePermission(permission);
  return allowed ? children : fallback;
}
