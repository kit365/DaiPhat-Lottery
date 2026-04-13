import { FooterSub } from "../../components/layouts/FooterSub";
import { ProductBanner } from "../product/sections/ProductBanner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "../../api/auth.api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const schema = z.object({
    password: z.string()
        .nonempty("Vui lòng nhập mật khẩu mới!")
        .min(8, "Mật khẩu phải có ít nhất 8 ký tự!")
        .regex(/[A-Z]/, "Mật khẩu phải có ít nhất một chữ cái viết hoa!")
        .regex(/[a-z]/, "Mật khẩu phải có ít nhất một chữ cái viết thường!")
        .regex(/\d/, "Mật khẩu phải có ít nhất một chữ số!")
        .regex(/[~!@#$%^&*]/, "Mật khẩu phải có ít nhất một ký tự đặc biệt! (~!@#$%^&*)"),
    confirmPassword: z.string().nonempty("Vui lòng xác nhận mật khẩu!"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp!",
    path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Đặt lại mật khẩu", to: "#" }
];

export const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    const onSubmit = async (data: FormData) => {
        try {
            const response = await resetPassword({ password: data.password });
            if (response.success) {
                toast.success(response.message);
                navigate("/auth/login");
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Đã có lỗi xảy ra!");
        }
    };

    return (
        <>
            <ProductBanner
                pageTitle="Đặt lại mật khẩu"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
            />
            <div className="app-container">
                <form className="p-[10px] mb-[300px] 2xl:mb-[230px] flex flex-col gap-[20px]" onSubmit={handleSubmit(onSubmit)}>
                    <p className="text-client-text text-[14px]">Nhập mật khẩu mới cho tài khoản của bạn.</p>

                    <div className="flex flex-col gap-[5px] w-[50%]">
                        <label htmlFor="password" align-items="center" className="block text-[14px] font-[600] text-client-text">Mật khẩu mới <span className="text-[#a00]">*</span></label>
                        <input
                            id="password"
                            type="password"
                            {...register("password")}
                            className={`block w-full py-[16px] px-[32px] border bg-white text-[#000] outline-none rounded-[40px] text-[15px] ${errors.password ? "border-red-500" : "border-[#200707cc]"}`}
                            placeholder="********"
                        />
                        {errors.password && <span className="text-red-500 text-[13px] ml-[20px]">{errors.password.message}</span>}
                    </div>

                    <div className="flex flex-col gap-[5px] w-[50%]">
                        <label htmlFor="confirmPassword" className="block text-[14px] font-[600] text-client-text">Xác nhận mật khẩu <span className="text-[#a00]">*</span></label>
                        <input
                            id="confirmPassword"
                            type="password"
                            {...register("confirmPassword")}
                            className={`block w-full py-[16px] px-[32px] border bg-white text-[#000] outline-none rounded-[40px] text-[15px] ${errors.confirmPassword ? "border-red-500" : "border-[#200707cc]"}`}
                            placeholder="********"
                        />
                        {errors.confirmPassword && <span className="text-red-500 text-[13px] ml-[20px]">{errors.confirmPassword.message}</span>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-[10px] w-fit text-white bg-client-primary hover:bg-client-secondary py-[16px] px-[50px] cursor-pointer text-[15px] font-secondary rounded-[40px] transition-default disabled:opacity-50"
                    >
                        {isSubmitting ? "Đang cập nhật..." : "Đổi mật khẩu"}
                    </button>
                </form>
            </div>
            <FooterSub />
        </>
    )
}
