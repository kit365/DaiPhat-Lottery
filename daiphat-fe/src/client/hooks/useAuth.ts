import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { authService } from "../../admin/pages/authen/services/auth.service";
import { useAuthStore } from "../../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { User } from "../../types/user.type";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import Cookies from "js-cookie";

export const useClientLogin = () => {
    const { token, user, set, login: loginStore } = useAuthStore();
    const navigate = useNavigate();

    // Pattern Admin: Fetch me if token exists but user doesn't (cache recovery)
    const getMeQuery = useQuery({
        queryKey: ["client-me", token],
        queryFn: authService.getMe,
        enabled: !!token && !user,
        staleTime: 1000 * 60 * 10,
    });

    useEffect(() => {
        if (getMeQuery.data) {
            const isSuccess = getMeQuery.data.isSuccess || getMeQuery.data.code === "SUCCESS";
            if (isSuccess && getMeQuery.data.data) {
                set({ user: getMeQuery.data.data as User });
            }
        }
    }, [getMeQuery.data, set]);


    return useMutation({
        mutationFn: (data: any) => authService.login(data),
        onSuccess: (response: any) => {
            const isSuccess = response.isSuccess || response.success || response.code === "SUCCESS";
            if (isSuccess && response.data?.access_token) {
                const { access_token, user: userInfo, expires_in } = response.data;
                
                // 1. Save to Zustand (Common Store)
                loginStore(userInfo as User, access_token, expires_in);
                
                // 2. Save to Cookies (Unified key)
                const cookieOptions = { 
                    expires: expires_in ? expires_in / 86400 : 7,
                    path: '/' 
                };
                Cookies.set(STORAGE_KEYS.TOKEN, access_token, cookieOptions);
                if (response.data.refresh_token) {
                    Cookies.set(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token, cookieOptions);
                }

                toast.success("Đăng nhập thành công!");
                // No reload needed, state is preserved and Header will reactive update
            } else {
                toast.error(response.message || "Đăng nhập thất bại.");
            }
        },
        onError: (error: any) => {
            // Error is handled globally by API interceptor
            console.error("Login mutation error:", error);
        }
    });
};

export const useClientRegister = () => {
    const { closeAuthModals } = useAuthStore();
    return useMutation({
        mutationFn: (data: any) => authService.register(data),
        onSuccess: (response: any) => {
            const isSuccess = response.isSuccess || response.code === "SUCCESS";
            if (isSuccess) {
                toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
                closeAuthModals();
            } else {
                toast.error(response.message || "Đăng ký thất bại.");
            }
        },
        onError: (error: any) => {
            // Error is handled globally by API interceptor
            console.error("Registration mutation error:", error);
        }
    });
};

// Re-exporting admin hook logic if needed, or keeping it as a bridge
export const useAuth = () => {
    const { user, token, logout } = useAuthStore();
    return {
        user,
        token,
        logout,
        isAuthenticated: !!token
    };
};
