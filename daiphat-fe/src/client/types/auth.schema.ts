import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập Email hoặc Tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const registerSchema = z
  .object({
    username: z.string()
      .min(4, "Tên đăng nhập tối thiểu 4 ký tự")
      .regex(/^[a-z0-9_@.]+$/, "Username chỉ được chứa chữ cái viết thường, số, dấu gạch dưới, ký tự @ và dấu chấm, không có khoảng trắng"),
    firstName: z.string().min(1, "Vui lòng nhập tên"),
    lastName: z.string().min(1, "Vui lòng nhập họ"),
    email: z.string().email("Email không hợp lệ"),
    phone: z.string()
      .min(10, "Số điện thoại tối thiểu 10 số")
      .regex(/^0(3[2-9]|7[06-9]|8[1-9]|9[0-46-9]|5[2689])[0-9]{7}$/, "Số điện thoại không hợp lệ hoặc không thuộc nhà mạng hỗ trợ"),
    password: z.string()
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
        .max(100, "Mật khẩu không được quá 100 ký tự")
        .regex(/^[A-Z]/, "Mật khẩu phải bắt đầu bằng chữ viết hoa")
        .regex(/^\S*$/, "Mật khẩu không được chứa khoảng trắng"),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
    agreedToTerms: z.boolean().refine(val => val === true, "Bạn phải đồng ý với điều khoản sử dụng")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
