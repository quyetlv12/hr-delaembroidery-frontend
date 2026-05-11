import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Mật khẩu hiện tại phải có ít nhất 8 ký tự"),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
    confirmPassword: z.string().min(8, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
