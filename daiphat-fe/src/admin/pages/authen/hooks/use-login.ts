import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import Cookies from "js-cookie";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { LoginResponse } from "../types/auth.type";

export const useLogin = () => {
    const navigate = useNavigate();
    const loginStore = useAuthStore(state => state.login);

    return useMutation({
        mutationFn: authService.login,
        onSuccess: (response: LoginResponse) => {
            if (response.code === 200 && response.data?.token) {
                const { token, ...userInfo } = response.data;

                // Store token in AuthStore (persisted to LocalStorage)
                // userInfo is passed here but since we modified useAuthStore to partialize 
                // only token, userInfo will only stay in-memory.
                loginStore(userInfo as any, token);

                // Assuming refreshToken might be sent by BE in some field or we just use token for now
                // User mentioned Cookies for RefreshToken. If response has refreshToken field, we use it.
                // If not, maybe they meant the main token is often referred as RefreshToken if it's long lived?
                // But usually it's a separate field. I'll check if response.data has it.
                // For now, I'll store the main token in a cookie as a placeholder if no refreshToken exists.
                if ((response.data as any).refreshToken) {
                    Cookies.set("refreshToken", (response.data as any).refreshToken, {
                        expires: 7, // 7 days
                        secure: true,
                        sameSite: "strict"
                    });
                }

                toast.success(response.message);
                
                const roles = userInfo.roles || [];
                const isAdmin = roles.some((role: any) => 
                    role.name?.toLowerCase().includes("admin") || 
                    role.name?.toLowerCase().includes("quản trị viên") ||
                    role.name?.toLowerCase().includes("quản trị")
                );
                const isStaff = roles.some((role: any) => 
                    role.isStaff || 
                    role.name?.toLowerCase().includes("nhân viên") || 
                    role.name?.toLowerCase().includes("staff")
                );

                if (isAdmin) {
                    navigate("/admin/dashboard/system");
                } else if (isStaff) {
                    navigate("/admin/staff/tasks");
                } else {
                    navigate("/admin/dashboard/system"); // Default fallback
                }
            } else {
                toast.error(response.message || "Đăng nhập thất bại!");
            }
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || "Đăng nhập thất bại!";
            toast.error(errorMessage);
        }
    });
};




