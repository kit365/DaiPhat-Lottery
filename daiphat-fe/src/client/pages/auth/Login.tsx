import { Link, useNavigate } from "react-router-dom";
import { Input } from "./sections/Input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAuthStore } from "../../../stores/useAuthStore";
import { login as loginApi } from "../../api/auth.api";
import { FooterSub } from "../../components/layouts/FooterSub";
import { ArrowRight } from "iconoir-react";

const schema = z.object({
    email: z
        .string()
        .nonempty("Vui lòng nhập email!")
        .email("Email không đúng định dạng!"),
    password: z
        .string()
        .nonempty("Vui lòng nhập mật khẩu!"),
    rememberPassword: z.boolean().optional()
});

type LoginFormData = z.infer<typeof schema>;

export const LoginPage = () => {
    const navigate = useNavigate();
    const loginStore = useAuthStore((state) => state.login);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
        defaultValues: {
            email: "",
            password: "",
            rememberPassword: false
        },
        resolver: zodResolver(schema)
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            const response = await loginApi(data);
            if (response.success) {
                toast.success(response.message || "Đăng nhập thành công!");
                loginStore(response.user, response.token);
                const roles = response.user?.roles || [];
                const isAdminOrAdminRole = roles.some((role: any) => 
                    role.name?.toLowerCase().includes("admin") || 
                    role.name?.toLowerCase().includes("quản trị viên") ||
                    role.name?.toLowerCase().includes("quản trị")
                );
                const isStaffRole = roles.some((role: any) => 
                    role.isStaff || 
                    role.name?.toLowerCase().includes("nhân viên") || 
                    role.name?.toLowerCase().includes("staff")
                );

                if (isAdminOrAdminRole) {
                    navigate("/admin/dashboard/system");
                } else if (isStaffRole) {
                    navigate("/admin/staff/tasks");
                } else {
                    navigate("/");
                }
            } else {
                toast.error(response.message || "Đăng nhập thất bại!");
            }
        } catch (error: any) {
            console.error(error);
            const message = error?.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau!";
            toast.error(message);
        }
    };

    const handleSocialLogin = (provider: 'google' | 'facebook') => {
        window.location.href = `http://localhost:3000/api/v1/client/auth/${provider}`;
    };

    return (
        <>
            <div className="app-container my-[100px]">
                <div className="flex items-center justify-center mx-auto max-w-[1200px]">
                    <div className="w-[570px] h-[680px] relative z-10">
                        <img src="https://i.imgur.com/LZKlu0w.jpeg" alt="" className="w-full h-full object-cover rounded-[12px] shadow-lg" />
                    </div>
                    <div className="w-[509px] ml-[-150px] relative z-20">
                        <div className="p-[50px] bg-white shadow-[0_10px_50px_rgba(0,0,0,0.15)] rounded-[12px]" >
                            <h3 className="text-center text-[1.875rem] font-[600] mb-[50px] text-[#333]">Đăng nhập 👋</h3>
                            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[20px]">
                                <div className="relative">
                                    <label className="absolute top-[-10px] left-[15px] bg-white px-[5px] text-[0.875rem] text-client-secondary z-10">Email</label>
                                    <Input
                                        placeholder="Nhập email của bạn"
                                        {...register("email")}
                                        error={errors.email?.message}
                                        errorColor="text-red-500"
                                        className="!rounded-[8px] !border-[#ddd] !px-[20px] !py-[15px] !text-[0.8125rem]"
                                        containerClassName="!mb-0"
                                    />
                                </div>

                                <div className="relative">
                                    <label className="absolute top-[-10px] left-[15px] bg-white px-[5px] text-[0.875rem] text-client-secondary z-10">Mật khẩu</label>
                                    <Input
                                        placeholder="Nhập mật khẩu của bạn"
                                        type="password"
                                        {...register("password")}
                                        error={errors.password?.message}
                                        errorColor="text-red-500"
                                        className="!rounded-[8px] !border-[#ddd] !px-[20px] !py-[15px] !text-[0.8125rem]"
                                        containerClassName="!mb-0"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-[10px]">
                                        <input
                                            type="checkbox"
                                            id="rememberPassword"
                                            {...register("rememberPassword")}
                                            className="appearance-none w-[18px] h-[18px] border-2 border-[#555] rounded-[4px] bg-white checked:bg-client-primary checked:border-client-primary cursor-pointer transition-all bg-center bg-no-repeat checked:bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20strokeWidth%3D%224%22%20strokeLinecap%3D%22round%22%20strokeLinejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] "
                                        />
                                        <label htmlFor="rememberPassword" className="text-[0.875rem] cursor-pointer select-none text-[#666]">Nhớ mật khẩu</label>
                                    </div>
                                    <Link to="/auth/forgot-password" title="Quên mật khẩu" className="text-client-secondary hover:text-client-primary transition-all text-[0.875rem]">Quên mật khẩu?</Link>
                                </div>

                                <button
                                    disabled={isSubmitting}
                                    className="w-full mt-[10px] relative overflow-hidden group bg-client-primary rounded-[8px] py-[10px] font-semibold text-[0.875rem] text-white cursor-pointer flex items-center justify-center gap-[10px] transition-all disabled:opacity-50"
                                >
                                    <span className="relative z-10">{isSubmitting ? "Đang xử lý..." : "Đăng nhập"}</span>
                                    {!isSubmitting && <ArrowRight className="relative z-10 w-[1.25rem] h-[1.25rem] transition-transform duration-300 rotate-[-45deg] group-hover:rotate-0" />}
                                    <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                </button>
                            </form>

                            <p className="text-center text-[#7d7b7b] mt-[25px]">Bạn chưa có tài khoản? <Link className="font-bold text-client-secondary hover:text-client-primary transition-all duration-300 ease-linear" to={"/auth/register"}>Đăng ký ngay</Link></p>

                            <p className="text-center text-client-secondary my-[20px] relative before:absolute before:content-[''] before:w-[42%] before:h-[1px] before:bg-[#eee] before:top-[12px] before:left-0 after:absolute after:content-[''] after:w-[42%] after:h-[1px] after:bg-[#eee] after:top-[12px] after:right-0 uppercase tracking-widest">HOẶC</p>

                            <div className="flex justify-center gap-[15px]">
                                <button
                                    onClick={() => handleSocialLogin('google')}
                                    className="flex items-center justify-center w-[40px] h-[40px] rounded-full border border-[#eee] hover:bg-[#f9f9f9] transition-all group cursor-pointer"
                                    title="Đăng nhập với Google"
                                >
                                    <img src="https://i.imgur.com/Z8EmTcv.png" alt="Google" className="w-[18px] h-[18px] transition-transform group-hover:scale-110" />
                                </button>
                                <button
                                    onClick={() => handleSocialLogin('facebook')}
                                    className="flex items-center justify-center w-[40px] h-[40px] rounded-full border border-[#eee] hover:bg-[#f9f9f9] transition-all group cursor-pointer"
                                    title="Đăng nhập với Facebook"
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
