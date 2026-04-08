import { FooterSub } from "../../components/layouts/FooterSub";
import { ProductBanner } from "../product/sections/ProductBanner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyOTP } from "../../api/auth.api";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";

const schema = z.object({
    email: z.string().email(),
    otp: z.string().nonempty("Vui lòng nhập mã OTP!").length(6, "Mã OTP phải có 6 ký tự!"),
});

type FormData = z.infer<typeof schema>;

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Xác nhận OTP", to: "#" }
];

export const OTPPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get("email") || "";

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { email }
    });

    const onSubmit = async (data: FormData) => {
        try {
            const response = await verifyOTP(data);
            if (response.success) {
                toast.success(response.message);
                navigate("/auth/reset-password");
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
                pageTitle="Xác nhận mã OTP"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
            />
            <div className="app-container">
                <form className="p-[10px] mb-[300px] 2xl:mb-[230px]" onSubmit={handleSubmit(onSubmit)}>
                    <p className="text-client-text mb-[20px] text-[14px]">Một mã OTP đã được gửi đến email <strong>{email}</strong>. Vui lòng nhập mã để tiếp tục.</p>
                    <input type="hidden" {...register("email")} />
                    <div className="flex flex-col gap-[5px] w-[50%]">
                        <label htmlFor="otp" className="block text-[14px] mb-[10px] text-client-text">Mã OTP <span className="font-[700] text-[#a00]">*</span></label>
                        <input
                            id="otp"
                            type="text"
                            {...register("otp")}
                            className={`block w-full py-[16px] px-[32px] border bg-white text-[#000] outline-none rounded-[40px] text-[15px] ${errors.otp ? "border-red-500" : "border-[#200707cc]"}`}
                            placeholder="Nhập 6 ký tự..."
                        />
                        {errors.otp && <span className="text-red-500 text-[13px] ml-[20px]">{errors.otp.message}</span>}
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-[30px] text-white bg-client-primary hover:bg-client-secondary py-[16px] px-[40px] cursor-pointer text-[15px] font-secondary rounded-[40px] transition-default disabled:opacity-50"
                    >
                        {isSubmitting ? "Đang xác nhận..." : "Xác nhận"}
                    </button>
                </form>
            </div>
            <FooterSub />
        </>
    )
}
