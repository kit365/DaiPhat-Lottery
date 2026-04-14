import { Link, useNavigate } from "react-router-dom";
import { Input } from "./sections/Input";
import { FooterSub } from "../../components/layouts/FooterSub";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { register as registerApi } from "../../api/auth.api";
import { toast } from "react-toastify";
import { ArrowRight } from "iconoir-react";


const schema = z.object({
    fullName: z
        .string()
        .nonempty("Vui lòng nhập họ tên!")
        .min(5, "Họ tên phải có ít nhất 5 ký tự!")
        .max(50, "Họ tên không được vượt quá 50 ký tự!"),
    email: z
        .string()
        .nonempty("Vui lòng nhập email!")
        .email("Email không đúng định dạng!"),
    phone: z
        .string()
        .nonempty("Vui lòng nhập số điện thoại!")
        .regex(/^(0?)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0|6-9]|9[0-4|6-9])[0-9]{7}$/, "Số điện thoại không đúng định dạng!"),
    password: z
        .string()
        .nonempty("Vui lòng nhập mật khẩu!")
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự!"),
    confirmPassword: z.string().nonempty("Vui lòng xác thực mật khẩu!")
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp!",
    path: ["confirmPassword"]
});

type RegisterFormData = z.infer<typeof schema>;

export const RegisterPage = () => {
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
        resolver: zodResolver(schema)
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            const submitData = {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                password: data.password
            };

            const response = await registerApi(submitData);

            if (response.success) {
                toast.success(response.message || "Đăng ký thành công! Vui lòng đăng nhập.");
                navigate("/auth/login");
            } else {
                toast.error(response.message || "Đăng ký thất bại!");
            }
        } catch (error: any) {
            console.error(error);
            const message = error?.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau!";
            toast.error(message);
        }
    };

    const handleSocialLogin = (provider: 'google' | 'facebook') => {
        window.location.href = `http://localhost:8080/client/auth/${provider}`;
    };

    return (
        <>
            <div className="app-container my-[100px]">
                <div className="flex items-center justify-center mx-auto max-w-[1200px]">
                    <div className="w-[570px] h-[850px] relative z-10">
                        <img src="https://i.imgur.com/wSh7ISz.png" alt="" className="w-full h-full object-cover rounded-[12px] shadow-lg" />
                    </div>
                    <div className="flex-1 max-w-[642px] ml-[-150px] relative z-20">
                        <div className="p-[50px] bg-white shadow-[0_10px_50px_rgba(0,0,0,0.15)] rounded-[12px]" >
                            <h3 className="text-center text-[1.875rem] font-[600] mb-[50px] text-[#333]">Đăng ký để tiếp tục 👋</h3>
                            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[20px]">
                                <div className="relative">
                                    <label className="absolute top-[-10px] left-[15px] bg-white px-[5px] text-[0.875rem] text-client-secondary z-10">Họ và tên</label>
                                    <Input
                                        placeholder="Nhập họ và tên"
                                        {...register("fullName")}
                                        error={errors.fullName?.message}
                                        errorColor="text-red-500"
                                        className="!rounded-[8px] !border-[#ddd] !px-[20px] !py-[15px] !text-[0.875rem]"
                                        containerClassName="!mb-0"
                                    />
                                </div>


                                <div className="relative">
                                    <label className="absolute top-[-10px] left-[15px] bg-white px-[5px] text-[0.875rem] text-client-secondary z-10">Email</label>
                                    <Input
                                        placeholder="example@Zenis.com"
                                        type="email"
                                        {...register("email")}
                                        error={errors.email?.message}
                                        errorColor="text-red-500"
                                        className="!rounded-[8px] !border-[#ddd] !px-[20px] !py-[15px] !text-[0.875rem]"
                                        containerClassName="!mb-0"
                                    />
                                </div>

                                <div className="relative">
                                    <label className="absolute top-[-10px] left-[15px] bg-white px-[5px] text-[0.875rem] text-client-secondary z-10">Số điện thoại</label>
                                    <Input
                                        placeholder="Số điện thoại"
                                        {...register("phone")}
                                        error={errors.phone?.message}
                                        errorColor="text-red-500"
                                        className="!rounded-[8px] !border-[#ddd] !px-[20px] !py-[15px] !text-[0.875rem]"
                                        containerClassName="!mb-0"
                                    />
                                </div>

                                <div className="flex gap-[20px]">
                                    <div className="flex-1 relative">
                                        <label className="absolute top-[-10px] left-[15px] bg-white px-[5px] text-[0.875rem] text-client-secondary z-10">Mật khẩu</label>
                                        <Input
                                            placeholder="********"
                                            type="password"
                                            {...register("password")}
                                            error={errors.password?.message}
                                            errorColor="text-red-500"
                                            className="!rounded-[8px] !border-[#ddd] !px-[20px] !py-[15px] !text-[0.875rem]"
                                            containerClassName="!mb-0"
                                        />
                                    </div>
                                    <div className="flex-1 relative">
                                        <label className="absolute top-[-10px] left-[15px] bg-white px-[5px] text-[0.875rem] text-client-secondary z-10">Xác nhận mật khẩu</label>
                                        <Input
                                            placeholder="********"
                                            type="password"
                                            {...register("confirmPassword")}
                                            error={errors.confirmPassword?.message}
                                            errorColor="text-red-500"
                                            className="!rounded-[8px] !border-[#ddd] !px-[20px] !py-[15px] !text-[0.875rem]"
                                            containerClassName="!mb-0"
                                        />
                                    </div>
                                </div>

                                <button
                                    disabled={isSubmitting}
                                    className="w-full mt-[15px] relative overflow-hidden group bg-client-primary rounded-[8px] py-[12px] font-[600] text-[0.9375rem] text-white cursor-pointer flex items-center justify-center gap-[10px] transition-all disabled:opacity-50"
                                >
                                    <span className="relative z-10">{isSubmitting ? "Đang xử lý..." : "Đăng ký"}</span>
                                    {!isSubmitting && <ArrowRight className="relative z-10 w-[1.25rem] h-[1.25rem] transition-transform duration-300 rotate-[-45deg] group-hover:rotate-0" />}
                                    <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                </button>
                            </form>
                            <p className="text-center text-[#7d7b7b] mt-[25px]">Bạn đã có tài khoản? <Link className="font-bold text-client-secondary hover:text-client-primary transition-all duration-300 ease-linear" to={"/auth/login"}>Đăng nhập ngay</Link></p>
                            <p className="text-center text-client-secondary my-[20px] relative before:absolute before:content-[''] before:w-[42%] before:h-[1px] before:bg-[#eee] before:top-[12px] before:left-0 after:absolute after:content-[''] after:w-[42%] after:h-[1px] after:bg-[#eee] after:top-[12px] after:right-0 uppercase tracking-widest">HOẶC</p>
                            <div className="flex justify-center gap-[15px]">
                                <button
                                    onClick={() => handleSocialLogin('google')}
                                    className="flex items-center justify-center w-[40px] h-[40px] rounded-full border border-[#eee] hover:bg-[#f9f9f9] transition-all group cursor-pointer"
                                    title="Đăng ký bằng Google"
                                >
                                    <img src="https://i.imgur.com/Z8EmTcv.png" alt="Google" className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
                                </button>
                                <button
                                    onClick={() => handleSocialLogin('facebook')}
                                    className="flex items-center justify-center w-[40px] h-[40px] rounded-full border border-[#eee] hover:bg-[#f9f9f9] transition-all group cursor-pointer"
                                    title="Đăng ký bằng Facebook"
                                >
                                    <img src="https://i.imgur.com/Rs4QZdc.png" alt="Facebook" className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <FooterSub />
        </>
    )
}
