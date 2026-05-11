import { z } from "zod";

export const roleSchema = z.object({
  name: z.string().min(2, "Vui lòng nhập tên vai trò"),
  permissionCodes: z.array(z.string()),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
