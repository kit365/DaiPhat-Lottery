import { z } from "zod";

export const accountAdminSchema = z.object({
    fullName: z.string().min(1, "Vui lòng nhập họ tên"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().optional(),
    phone: z.string().optional(),
    roles: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một nhóm quyền"),
    status: z.enum(["active", "inactive"]),
    avatar: z.string().optional().nullable(),
});

export type AccountAdminFormValues = z.infer<typeof accountAdminSchema>;

export const changePasswordSchema = z.object({
    password: z.string().min(6, "Mật khẩu mới ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng xác nhận mật khẩu mới"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
