import type { PermissionCode } from "@/constants/permissions";
import { useAuth } from "@/features/auth/use-auth";

export function usePermission(permission?: PermissionCode) {
  const { user } = useAuth();
  if (!permission) {
    return true;
  }
  return Boolean(user?.permissions.includes(permission));
}

export function usePermissions() {
  const { user } = useAuth();

  return {
    can(permission: PermissionCode) {
      return Boolean(user?.permissions.includes(permission));
    },
  };
}
