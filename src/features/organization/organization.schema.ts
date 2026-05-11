import { z } from "zod";

export const organizationFormSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã"),
  name: z.string().min(1, "Vui lòng nhập tên"),
  description: z.string().optional(),
  departmentId: z.string().optional(),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
