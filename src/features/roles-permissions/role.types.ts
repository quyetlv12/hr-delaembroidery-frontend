export type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
};

export type PermissionOption = {
  label: string;
  value: string;
  module: string;
  action: string;
};

export type RoleFormOptions = {
  permissions: PermissionOption[];
};
