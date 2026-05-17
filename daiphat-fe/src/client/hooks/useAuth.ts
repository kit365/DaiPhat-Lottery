import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../admin/pages/authen/services/auth.service";
import { useAuthStore } from "../../stores/useAuthStore";
import { User } from "../../types/user.type";
import { useNavigate } from "react-router-dom";
import { AppToast } from "../utils/toast.util";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import Cookies from "js-cookie";
import { RegisterRequest } from "../../admin/pages/authen/types/auth.type";
import { updateUser } from "../../admin/api/account-user.api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema, LoginFormValues, registerSchema, RegisterFormValues } from "../types/auth.schema";
import { QUERY_KEYS } from "../../constants/queryKeys";

export const useAuth = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Token from Zustand (persisted) — source of truth for auth status
    const token = useAuthStore((state) => state.token);
    const logoutStore = useAuthStore((state) => state.logout);
    const loginStore = useAuthStore((state) => state.login);
    const closeAuthModals = useAuthStore((state) => state.closeAuthModals);

    // React Query is the SINGLE SOURCE OF TRUTH for user data
    // No useEffect syncing to Zustand needed — components read directly from here
    const getMeQuery = useQuery({
        queryKey: [QUERY_KEYS.CLIENT_ME, token],
        queryFn: authService.getMe,
        enabled: !!token,
        staleTime: 0,         // always refetch when invalidated
        gcTime: 1000 * 60 * 5,
        retry: false,
    });

    // Derive user from query — re-renders automatically when query data changes
    const user = (getMeQuery.data?.data ?? null) as User | null;

    const loginMutation = useMutation({
        mutationFn: (data: LoginFormValues) => authService.login(data),
        onSuccess: (response: any) => {
            const isSuccess = response.isSuccess;
            if (isSuccess && response.data?.access_token) {
                const { access_token, user: userInfo, expires_in } = response.data;
                loginStore(userInfo as User, access_token, expires_in);

                const cookieOptions = {
                    expires: expires_in ? expires_in / 86400 : 7,
                    path: '/'
                };
                Cookies.set(STORAGE_KEYS.TOKEN, access_token, cookieOptions);
                if (response.data.refresh_token) {
                    Cookies.set(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token, cookieOptions);
                }

                AppToast.success(response.message || "Đăng nhập thành công!");
                closeAuthModals();
            } else {
                AppToast.error(response.message || "Đăng nhập thất bại.");
            }
        }
    });

    const registerMutation = useMutation({
        mutationFn: (data: RegisterRequest) => authService.register(data),
        onSuccess: (response: any) => {
            const isSuccess = response.isSuccess;
            if (isSuccess) {
                AppToast.success(response.message || "Đăng ký thành công! Vui lòng kiểm tra email.");
                closeAuthModals();
            } else {
                AppToast.error(response.message || "Đăng ký thất bại.");
            }
        }
    });

    const updateProfileMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
        onSuccess: (response: any) => {
            const isSuccess = response.isSuccess;
            if (isSuccess && response.data) {
                queryClient.setQueryData(
                    [QUERY_KEYS.CLIENT_ME, token],
                    (oldData: any) => ({
                        ...oldData,
                        data: response.data,
                    })
                );
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_ME, token] });
                AppToast.success(response.message || "Cập nhật thành công");
            } else {
                AppToast.error(response.message || "Cập nhật thất bại");
            }
        }
    });

    const loginForm = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: "", password: "" },
    });

    const registerForm = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            username: "",
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
            agreedToTerms: false,
        },
    });

    const handleLogin = loginForm.handleSubmit((values) => {
        loginMutation.mutate(values);
    });

    const handleRegister = registerForm.handleSubmit(({ confirmPassword, ...payload }) => {
        void confirmPassword;
        registerMutation.mutate(payload);
    });

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error("Lỗi đăng xuất phía backend:", error);
        }
        logoutStore();
        queryClient.removeQueries({ queryKey: [QUERY_KEYS.CLIENT_ME] });
        Cookies.remove(STORAGE_KEYS.TOKEN);
        Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN);
        navigate("/");
        AppToast.success("Đăng xuất thành công!");
    };

    return {
        // State
        user,
        token,
        isAuthenticated: !!token,
        isUserLoading: getMeQuery.isLoading && !!token,

        // Mutations
        loginMutation,
        registerMutation,
        updateProfileMutation,

        // Form Helpers
        loginForm,
        registerForm,
        handleLogin,
        handleRegister,
        handleUpdateProfile: updateProfileMutation.mutate,
        handleLogout,

        // Actions
        logout: handleLogout
    };
};
