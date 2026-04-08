import { z } from "zod";

export const loginSchema = z.object({
    usernameOrEmail: z
        .string()
        .min(1, "Vui lòng nhập tên đăng nhập hoặc email"),

    password: z
        .string()
        .min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
