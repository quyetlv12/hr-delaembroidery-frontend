import { z } from "zod";

export const loginSchema = z.object({
  loginCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^DLE\d{3}$/, "Mã đăng nhập phải có dạng DLE001")),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
