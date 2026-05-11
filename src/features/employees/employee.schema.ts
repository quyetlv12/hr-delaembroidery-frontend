import { z } from "zod";

export const employeeSchema = z.object({
  employeeCode: z.string().min(1, "Vui lòng nhập mã nhân viên"),
  timekeepingCode: z.string().optional(),
  fullName: z.string().min(2, "Vui lòng nhập họ tên"),
  gender: z.enum(["male", "female", "other"]),
  birthday: z.string().optional(),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  cccd: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  joinDate: z.string().min(1, "Vui lòng chọn ngày vào làm"),
  contractType: z.string().optional(),
  salary: z.string().min(1, "Vui lòng nhập lương cơ bản"),
  shiftCount: z.enum(["1", "2"]),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  loginPassword: z
    .union([z.literal(""), z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự")])
    .optional(),
  taxCode: z.string().optional(),
  insuranceCode: z.string().optional(),
  status: z.enum(["active", "inactive", "probation"]),
  avatar: z.instanceof(File).nullable().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
