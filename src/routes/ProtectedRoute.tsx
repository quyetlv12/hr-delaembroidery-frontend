import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import type { PermissionCode } from "@/constants/permissions";
import { useAuth } from "@/features/auth/use-auth";
import { usePermission } from "@/hooks/use-permission";

type ProtectedRouteProps = {
  children: ReactNode;
  permission?: PermissionCode;
};

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const allowed = usePermission(permission);

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (!allowed) {
    return <Navigate replace to="/" />;
  }

  return children;
}
