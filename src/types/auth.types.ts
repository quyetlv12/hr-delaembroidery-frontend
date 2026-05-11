import type { PermissionCode } from "@/constants/permissions";

export type UserRole = {
  id: string;
  name: string;
  isSystem: boolean;
};

export type AuthUser = {
  id: string;
  loginCode: string;
  email: string;
  fullName: string;
  employeeId?: string;
  roles: UserRole[];
  permissions: PermissionCode[];
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};
