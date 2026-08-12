"use client";

import { useState } from "react";
import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    clearAdminAuthSession,
    completeAdminLoginSession,
    getUserRoleCode,
    isRestrictedAdminRoleCode,
    persistAdminAccessToken,
} from "@/admin/lib/adminSession.utils";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "react-toastify";
import { ROUTES } from "@/admin/constants/routes";
import { USER_ROLES } from "@/constants/role.constants";
import { LoginResponse } from "../types/auth.type";
import { LoginFormValues } from "@/admin/features/auth/schemas/login.schema";
import { STORAGE_KEYS } from "@/constants/storage.constants";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { prefetchAdminLoginDestinations } from "@/admin/utils/prefetchAdminPages";
import { queueAdminLoginToast } from "@/admin/lib/adminLoginToast.utils";

export const useAuth = () => {
    const router = useAdminRouter();
    const pathname = usePathname() ?? "";
    const queryClient = useQueryClient();
    const { user, token, logout } = useAuthStore();
    const [isAuthFlowActive, setIsAuthFlowActive] = useState(false);

    const stopAuthFlow = () => setIsAuthFlowActive(false);

    const redirectAfterAuth = (
        destination: string,
        toast?: { type: "success" | "info"; message: string },
    ) => {
        if (toast) {
            queueAdminLoginToast(toast);
        }

        requestAnimationFrame(() => {
            router.replace(destination);
        });
    };

    const loginMutation = useMutation({
        onMutate: () => {
            setIsAuthFlowActive(true);
        },
        mutationFn: (data: LoginFormValues) => authService.login({ ...data, rememberMe: false }),
        onSuccess: async (response: LoginResponse) => {
            const isSuccess = response.isSuccess ?? response.success;
            const authData = response.data;
            const accessToken = authData?.access_token ?? authData?.accessToken;
            const expiresIn = authData?.expires_in ?? authData?.expiresIn;

            if (!isSuccess || !accessToken) {
                stopAuthFlow();
                toast.error(response.message || "Đăng nhập thất bại.");
                return;
            }

            persistAdminAccessToken(accessToken, expiresIn);

            const meResponse = authData?.user
                ? { isSuccess: true, success: true, message: "Success", data: authData.user }
                : await userService.getMe();
            const meSuccess = meResponse.isSuccess ?? meResponse.success;
            const userInfo = meResponse.data;

            if (!meSuccess || !userInfo) {
                stopAuthFlow();
                toast.error("Đăng nhập thành công nhưng không lấy được thông tin người dùng.");
                clearAdminAuthSession();
                return;
            }

            const roleCode = getUserRoleCode(userInfo);
            if (isRestrictedAdminRoleCode(roleCode)) {
                stopAuthFlow();
                toast.error("Tài khoản này không có quyền truy cập vùng quản trị.");
                clearAdminAuthSession();
                return;
            }

            completeAdminLoginSession(queryClient, userInfo, accessToken, expiresIn);

            const destination = !userInfo.hasPassword
                ? ROUTES.ADMIN.AUTH.SETUP_PROFILE
                : ROUTES.ADMIN.DASHBOARD.SYSTEM;

            const loginToast = !userInfo.hasPassword
                ? { type: "info" as const, message: "Vui lòng thiết lập mật khẩu cho lần đăng nhập đầu tiên." }
                : roleCode === USER_ROLES.ADMIN
                  ? { type: "success" as const, message: "Chào mừng Quản trị viên!" }
                  : { type: "success" as const, message: "Đăng nhập thành công!" };

            redirectAfterAuth(destination, loginToast);
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            stopAuthFlow();
            toast.error(error.response?.data?.message || "Lỗi đăng nhập.");
        },
    });

    const oauthCallbackMutation = useMutation({
        onMutate: () => {
            setIsAuthFlowActive(true);
        },
        mutationFn: (params: { code: string; redirectUri: string; codeVerifier?: string }) =>
            authService.exchangeGoogleToken(params.code, params.redirectUri, params.codeVerifier),
        onSuccess: async (response) => {
            if (!response?.access_token) {
                return;
            }

            const { access_token, expires_in } = response;
            persistAdminAccessToken(access_token, expires_in);

            sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
            sessionStorage.removeItem(STORAGE_KEYS.OAUTH_REDIRECT_URI);

            const isClientCallback = !pathname.startsWith(ROUTES.ADMIN.ROOT);

            if (!isClientCallback) {
                prefetchAdminLoginDestinations(router.prefetch);
            }

            try {
                const meResponse = await userService.getMe();
                const meSuccess = meResponse.isSuccess ?? meResponse.success;
                const userInfo = meResponse.data;

                if (!meSuccess || !userInfo) {
                    stopAuthFlow();
                    toast.error("Xác thực Google thành công nhưng không lấy được thông tin người dùng.");
                    return;
                }

                const roleCode = getUserRoleCode(userInfo);
                if (!isClientCallback && isRestrictedAdminRoleCode(roleCode)) {
                    stopAuthFlow();
                    toast.error("Tài khoản này không có quyền truy cập vùng quản trị.");
                    clearAdminAuthSession();
                    return;
                }

                completeAdminLoginSession(queryClient, userInfo, access_token, expires_in);
                queryClient.setQueryData([QUERY_KEYS.CLIENT_ME, access_token], {
                    isSuccess: true,
                    success: true,
                    message: "Success",
                    data: userInfo,
                });

                if (isClientCallback) {
                    stopAuthFlow();
                    toast.success("Xác thực Google thành công!");
                    if (!userInfo.agreedToTerms) {
                        sessionStorage.setItem(STORAGE_KEYS.FORCE_PROFILE_SETUP, "true");
                    }

                    router.push(ROUTES.PUBLIC.HOME);
                    return;
                }

                const destination =
                    !userInfo.hasPassword || !userInfo.agreedToTerms
                        ? ROUTES.ADMIN.AUTH.SETUP_PROFILE
                        : ROUTES.ADMIN.DASHBOARD.SYSTEM;

                redirectAfterAuth(destination, {
                    type: "success",
                    message: "Xác thực Google thành công!",
                });
            } catch {
                stopAuthFlow();
                toast.error("Xác thực Google thành công nhưng không lấy được thông tin người dùng.");
            }
        },
        onError: () => {
            stopAuthFlow();
            sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
            sessionStorage.removeItem(STORAGE_KEYS.OAUTH_REDIRECT_URI);
            toast.error("Xác thực OAuth thất bại.");
            const isClientCallback = !pathname.startsWith(ROUTES.ADMIN.ROOT);
            router.push(isClientCallback ? "/login" : ROUTES.ADMIN.AUTH.LOGIN);
        },
    });

    const isLoginPending = loginMutation.isPending;
    const isOAuthPending = oauthCallbackMutation.isPending;

    return {
        user,
        token,
        isLoading: isAuthFlowActive,
        isRedirecting: isAuthFlowActive && !isLoginPending && !isOAuthPending,
        login: loginMutation.mutate,
        logout,
        handleOAuthCallback: oauthCallbackMutation.mutate,
        isLoginPending,
        isOAuthPending,
    };
};
