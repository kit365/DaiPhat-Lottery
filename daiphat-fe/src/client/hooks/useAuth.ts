"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authService } from "@/shared/auth/services/auth.service";
import { userService } from "@/shared/auth/services/user.service";
import { useAuthStore } from "../../stores/useAuthStore";
import { User } from "../../types/user.type";
import { AppToast } from "../../utils/toast.util";
import { STORAGE_KEYS } from "../../constants/storage.constants";
import Cookies from "js-cookie";
import { RegisterRequest } from "@/shared/auth/types/auth.type";
import { updateUser } from "../../admin/features/users/services/userService";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema, LoginFormValues, registerSchema, RegisterFormValues } from "../types/auth.schema";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { USER_ROLES } from "../../constants/role.constants";

export const useAuth = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [pendingVerificationIdentifier, setPendingVerificationIdentifier] = useState<string | null>(null);

    // Token from Zustand (persisted) — source of truth for auth status
    const token = useAuthStore((state) => state.token);
    const logoutStore = useAuthStore((state) => state.logout);
    const loginStore = useAuthStore((state) => state.login);
    const closeAuthModals = useAuthStore((state) => state.closeAuthModals);

    // React Query is the SINGLE SOURCE OF TRUTH for user data
    // No useEffect syncing to Zustand needed — components read directly from here
    const getMeQuery = useQuery({
        queryKey: [QUERY_KEYS.CLIENT_ME, token],
        // Wrap so React Query's QueryFunctionContext is not passed as accessToken.
        queryFn: () => authService.getMe(),
        enabled: !!token,
        staleTime: 0,         // always refetch when invalidated
        gcTime: 1000 * 60 * 5,
        retry: false,
    });

    // Derive user from query — re-renders automatically when query data changes
    const user = (getMeQuery.data?.data ?? null) as User | null;

    const loginMutation = useMutation({
        mutationFn: (data: LoginFormValues) => authService.login(data),
        onMutate: () => {
            setPendingVerificationIdentifier(null);
            // Clear broken session so login isn't racing with refresh-token failures
            Cookies.remove(STORAGE_KEYS.TOKEN, { path: "/" });
            Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: "/" });
            logoutStore();
        },
        onSuccess: async (response) => {
            setPendingVerificationIdentifier(null);
            const isSuccess = response.isSuccess ?? response.success;
            const authData = response.data;
            const accessToken = authData?.access_token ?? authData?.accessToken;
            const expiresIn = authData?.expires_in ?? authData?.expiresIn;

            if (isSuccess && accessToken) {
                const meResponse = authData?.user
                    ? { isSuccess: true, success: true, data: authData.user }
                    : await authService.getMe(accessToken);
                const meSuccess = meResponse.isSuccess ?? meResponse.success;
                const userInfo = meResponse.data;

                if (!meSuccess || !userInfo) {
                    AppToast.error("Đăng nhập thành công nhưng không lấy được thông tin người dùng.");
                    return;
                }

                const roleCode = (userInfo as User).role?.code || "";
                if (roleCode === USER_ROLES.STREET_AGENT) {
                    AppToast.error("Tài khoản Street Agent chỉ dùng để quản lý hồ sơ nội bộ.");
                    logoutStore();
                    Cookies.remove(STORAGE_KEYS.TOKEN);
                    Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN);
                    return;
                }

                const cookieOptions = {
                    expires: expiresIn ? expiresIn / 86400 : 7,
                    path: '/'
                };
                Cookies.set(STORAGE_KEYS.TOKEN, accessToken, cookieOptions);
                loginStore(userInfo as User, accessToken, expiresIn);
                queryClient.setQueryData([QUERY_KEYS.CLIENT_ME, accessToken], {
                    isSuccess: true,
                    success: true,
                    data: userInfo
                });

                AppToast.success(response.message || "Đăng nhập thành công!");
                closeAuthModals();
            } else {
                AppToast.error(response.message || "Đăng nhập thất bại.");
            }
        },
        onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
            const status = error.response?.status;
            const message = error.response?.data?.message;
            const isUnverifiedEmail =
                typeof message === "string" &&
                (message.includes("Email chưa được xác thực") ||
                    message.includes("Tài khoản chưa được kích hoạt"));

            if (isUnverifiedEmail) {
                setPendingVerificationIdentifier(loginForm.getValues("username"));
                return;
            }

            setPendingVerificationIdentifier(null);
            if (status === 401) {
                AppToast.error(message || "Tên đăng nhập hoặc mật khẩu không đúng.");
            } else if (message) {
                AppToast.error(message);
            } else {
                AppToast.error("Không thể đăng nhập. Vui lòng thử lại.");
            }
        }
    });

    const registerMutation = useMutation({
        mutationFn: (data: RegisterRequest) => authService.register(data),
        onSuccess: (response) => {
            const isSuccess = response.isSuccess ?? response.success;
            if (isSuccess) {
                AppToast.success(response.message || "Đăng ký thành công! Vui lòng kiểm tra email.");
                closeAuthModals();
                registerForm.reset();
                router.push("/login");
            } else {
                AppToast.error(response.message || "Đăng ký thất bại.");
            }
        }
    });

    const resendVerificationMutation = useMutation({
        mutationFn: (identifier: string) => authService.resendVerification(identifier),
        onSuccess: (response) => {
            const isSuccess = response.isSuccess ?? response.success;
            if (isSuccess) {
                AppToast.success(response.message || "Đã gửi lại email xác thực.");
            } else {
                AppToast.error(response.message || "Gửi lại email xác thực thất bại.");
            }
        }
    });

    const updateProfileMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateUser>[1] }) => updateUser(id, data),
        onSuccess: (response) => {
            const isSuccess = response.isSuccess ?? response.success;
            if (isSuccess) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_ME] });
                AppToast.success(response.message || "Cập nhật thành công");
            } else {
                AppToast.error(response.message || "Cập nhật thất bại");
            }
        }
    });

    const uploadAvatarMutation = useMutation({
        mutationFn: (file: File) => {
            if (!file.type.startsWith("image/")) {
                throw new Error("Vui lòng chọn đúng định dạng ảnh.");
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Ảnh đại diện không được vượt quá 5MB.");
            }
            return userService.uploadMyAvatar(file);
        },
        onSuccess: (response) => {
            const isSuccess = response.isSuccess ?? response.success;
            if (isSuccess && response.data) {
                queryClient.setQueryData([QUERY_KEYS.CLIENT_ME, token], {
                    isSuccess: true,
                    success: true,
                    message: response.message,
                    data: response.data,
                });
                useAuthStore.getState().set({ user: response.data as User });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_ME, token] });
                AppToast.success(response.message || "Cập nhật ảnh đại diện thành công.");
            } else {
                AppToast.error(response.message || "Cập nhật ảnh đại diện thất bại.");
            }
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            AppToast.error(error?.message || error?.response?.data?.message || "Cập nhật ảnh đại diện thất bại.");
        }
    });

    const deleteAvatarMutation = useMutation({
        mutationFn: userService.deleteMyAvatar,
        onSuccess: (response) => {
            const isSuccess = response.isSuccess ?? response.success;
            if (isSuccess && response.data) {
                queryClient.setQueryData([QUERY_KEYS.CLIENT_ME, token], {
                    isSuccess: true,
                    success: true,
                    message: response.message,
                    data: response.data,
                });
                useAuthStore.getState().set({ user: response.data as User });
                queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENT_ME, token] });
                AppToast.success(response.message || "Đã xóa ảnh đại diện.");
            } else {
                AppToast.error(response.message || "Xóa ảnh đại diện thất bại.");
            }
        },
        onError: (error: Error & { response?: { data?: { message?: string } } }) => {
            AppToast.error(error?.response?.data?.message || "Xóa ảnh đại diện thất bại.");
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
        router.push("/");
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
        resendVerificationMutation,
        updateProfileMutation,
        uploadAvatarMutation,
        deleteAvatarMutation,

        // Form Helpers
        loginForm,
        registerForm,
        handleLogin,
        handleRegister,
        handleUpdateProfile: updateProfileMutation.mutate,
        handleUploadAvatar: uploadAvatarMutation.mutate,
        handleDeleteAvatar: deleteAvatarMutation.mutate,
        handleLogout,
        pendingVerificationIdentifier,
        resendVerificationEmail: resendVerificationMutation.mutate,

        // Actions
        logout: handleLogout
    };
};
