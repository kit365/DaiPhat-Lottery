import { FooterSub } from "../../components/layouts/FooterSub";
import { ProductBanner } from "../product/sections/ProductBanner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPassword } from "../../api/auth.api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const schema = z.object({
    email: z.string().nonempty("Vui lòng nhập email!").email("Email không đúng định dạng!"),
});

type FormData = z.infer<typeof schema>;

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Quên mật khẩu", to: "/auth/forgot-password" }
];

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    const onSubmit = async (data: FormData) => {
        try {
            const response = await forgotPassword(data);
            if (response.success) {
                toast.success(response.message);
                navigate(`/auth/otp-password?email=${data.email}`);
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
                pageTitle="Tài khoản"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
            />
            <div className="app-container">
                <form className="p-[10px] mb-[300px] 2xl:mb-[230px]" onSubmit={handleSubmit(onSubmit)}>
                    <p className="text-client-text mb-[20px] text-[14px]">Quên mật khẩu? Vui lòng nhập địa chỉ email của bạn. Bạn sẽ nhận được mã OTP để tạo mật khẩu mới qua email.</p>
                    <div className="flex flex-col gap-[5px] w-[50%]">
                        <label htmlFor="email" className="block text-[14px] mb-[10px] text-client-text">Địa chỉ email <span className="font-[700] text-[#a00]">*</span></label>
                        <input
                            id="email"
                            type="text"
                            {...register("email")}
                            className={`block w-full py-[16px] px-[32px] border bg-white text-[#000] outline-none rounded-[40px] text-[15px] ${errors.email ? "border-red-500" : "border-[#200707cc]"}`}
                            placeholder="username@gmail.com"
                        />
                        {errors.email && <span className="text-red-500 text-[13px] ml-[20px]">{errors.email.message}</span>}
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-[30px] text-white bg-client-primary hover:bg-client-secondary py-[16px] px-[40px] cursor-pointer text-[15px] font-secondary rounded-[40px] transition-default disabled:opacity-50"
                    >
                        {isSubmitting ? "Đang gửi..." : "Gửi mã OTP"}
                    </button>
                </form>
            </div>
            <FooterSub />
        </>
    )
}