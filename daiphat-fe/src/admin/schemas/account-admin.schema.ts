import { z } from "zod";

export const accountAdminSchema = z.object({
    firstName: z.string().min(1, "Vui lòng nhập tên"),
    lastName: z.string().min(1, "Vui lòng nhập họ"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().optional(),
    phone: z.string().optional(),
    roles: z.array(z.string()).min(1, "Vui lòng chọn ít nhất một nhóm quyền"),
    status: z.enum(["active", "inactive"]),
    avatar: z.string().optional().nullable(),
});

export type AccountAdminFormValues = z.infer<typeof accountAdminSchema>;

export const changePasswordSchema = z.object({
    password: z.string().min(1, "Vui lòng nhập mật khẩu mới"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
