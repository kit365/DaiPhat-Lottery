import { ArrowRight } from "iconoir-react";
import { ProductBanner } from "../product/sections/ProductBanner";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "./sections/Sidebar";
import { toast } from "react-toastify";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { editProfile } from "../../api/dashboard.api";
import { useEffect } from "react";

const schema = z.object({
    fullName: z.string().nonempty("Vui lòng nhập họ tên!"),
    email: z.string().nonempty("Vui lòng nhập email!").email("Email không đúng định dạng!"),
    phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export const ProfileEditPage = () => {
    const { user, set, isHydrated } = useAuthStore();
    const navigate = useNavigate();

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (user) {
            reset({
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || "",
            });
        }
    }, [user, reset]);

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Chỉnh sửa thông tin", to: `/dashboard/profile/edit` },
    ];

    if (!isHydrated) return null;

    if (!user) {
        return (
            <>
                <ProductBanner
                    pageTitle="Tài khoản"
                    breadcrumbs={breadcrumbs}
                    url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                    className="bg-top"
                />
                <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-[#f9f9f9]">
                    <p className="text-[18px] text-client-secondary">Vui lòng đăng nhập để xem thông tin tài khoản.</p>
                    <Link to="/auth/login" className="bg-client-secondary text-white px-8 py-3 rounded-full text-[16px] hover:bg-client-primary transition-all">Đăng nhập ngay</Link>
                </div>
            </>
        );
    }

    const onSubmit = async (data: FormData) => {
        try {
            const response = await editProfile(data);
            if (response.success) {
                toast.success(response.message);
                // Cập nhật lại store
                set({ user: { ...user, ...data } });
                navigate("/dashboard/profile");
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
                pageTitle="Chỉnh sửa thông tin"
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
                        <h3 className="text-[24px] font-[600] text-client-secondary mb-[25px] flex items-center justify-between">
                            Chỉnh sửa thông tin
                            <Link className="relative overflow-hidden group bg-[#ffa500] rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white" to={"/dashboard/profile"}>
                                <span className="relative z-10">Hủy</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-[#cc8400] transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </h3>
                        <div className="p-[25px] border border-[#eee] rounded-[10px]">
                            <form className="space-y-[20px]" onSubmit={handleSubmit(onSubmit)}>
                                <div className="grid grid-cols-2 gap-[25px]">
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Họ tên</label>
                                        <input
                                            type="text"
                                            {...register("fullName")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.fullName ? "border-red-500" : "border-[#eee]"}`}
                                        />
                                        {errors.fullName && <span className="text-red-500 text-[13px]">{errors.fullName.message}</span>}
                                    </div>
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Email</label>
                                        <input
                                            type="email"
                                            {...register("email")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.email ? "border-red-500" : "border-[#eee]"}`}
                                        />
                                        {errors.email && <span className="text-red-500 text-[13px]">{errors.email.message}</span>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-[25px]">
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Số điện thoại</label>
                                        <input
                                            type="text"
                                            {...register("phone")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.phone ? "border-red-500" : "border-[#eee]"}`}
                                        />
                                        {errors.phone && <span className="text-red-500 text-[13px]">{errors.phone.message}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-[10px] pt-[20px]">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[30px] py-[12px] font-[500] text-[14px] text-white cursor-pointer flex items-center gap-[8px] disabled:opacity-50"
                                    >
                                        <span className="relative z-10">{isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}</span>
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
