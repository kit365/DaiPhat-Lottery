import { ArrowRight } from "iconoir-react";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Sidebar } from "./sections/Sidebar";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword } from "../../api/dashboard.api";

const schema = z.object({
    newPassword: z.string()
        .nonempty("Vui lòng nhập mật khẩu mới!")
        .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự!")
        .regex(/[A-Z]/, "Mật khẩu mới phải có ít nhất một chữ cái viết hoa!")
        .regex(/[a-z]/, "Mật khẩu mới phải có ít nhất một chữ cái viết thường!")
        .regex(/\d/, "Mật khẩu mới phải có ít nhất một chữ số!")
        .regex(/[~!@#$%^&*]/, "Mật khẩu mới phải có ít nhất một ký tự đặc biệt! (~!@#$%^&*)"),
    confirmPassword: z.string().nonempty("Vui lòng xác nhận mật khẩu mới!"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp!",
    path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export const ChangePasswordPage = () => {
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Đổi mật khẩu", to: `/dashboard/change-password` },
    ];

    const onSubmit = async (data: FormData) => {
        try {
            const response = await changePassword(data);
            if (response.success) {
                toast.success(response.message);
                reset();
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
                pageTitle="Đổi mật khẩu"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                className="bg-top"
            />

            <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
                <div className="w-[25%] px-[12px] flex">
                    <Sidebar />
                </div>
                <div className="w-[75%] px-[12px]">
                    <div className="mt-[100px] p-[35px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[12px]">
                        <h3 className="text-[24px] font-[600] text-client-secondary mb-[25px]">
                            Đổi mật khẩu
                        </h3>
                        <div className="p-[25px] border border-[#eee] rounded-[10px]">
                            <form className="space-y-[20px]" onSubmit={handleSubmit(onSubmit)}>
                                <div className="grid grid-cols-2 gap-[25px]">
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Mật khẩu mới <span className="text-red-500">*</span></label>
                                        <input
                                            type="password"
                                            {...register("newPassword")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.newPassword ? 'border-red-500 text-red-500' : 'border-[#eee]'}`}
                                            placeholder="Nhập mật khẩu mới"
                                        />
                                        {errors.newPassword && <span className="text-red-500 text-[13px] ml-[5px]">{errors.newPassword.message}</span>}
                                    </div>
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Xác nhận mật khẩu mới <span className="text-red-500">*</span></label>
                                        <input
                                            type="password"
                                            {...register("confirmPassword")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.confirmPassword ? 'border-red-500 text-red-500' : 'border-[#eee]'}`}
                                            placeholder="Nhập lại mật khẩu mới"
                                        />
                                        {errors.confirmPassword && <span className="text-red-500 text-[13px] ml-[5px]">{errors.confirmPassword.message}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-[10px] pt-[20px]">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[30px] py-[12px] font-[500] text-[14px] text-white cursor-pointer flex items-center gap-[8px] disabled:opacity-50"
                                    >
                                        <span className="relative z-10">{isSubmitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}</span>
                                        {!isSubmitting && <ArrowRight className="relative z-10 w-[18px] h-[18px] transition-transform duration-300 rotate-[-45deg] group-hover:rotate-0" />}
                                        <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
