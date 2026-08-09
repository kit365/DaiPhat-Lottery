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
import { useAuthStore } from "../../../../stores/useAuthStore";
import { toast } from "react-toastify";
import { ROUTES } from "../../../constants/routes";
import { USER_ROLES } from "../../../../constants/role.constants";
import { LoginResponse } from "../types/auth.type";
import { LoginFormValues } from "../../../schemas/login.schema";
import { STORAGE_KEYS } from "../../../../constants/storage.constants";
import { QUERY_KEYS } from "../../../../constants/queryKeys";
import { prefetchAdminDestination } from "@/admin/utils/prefetchAdminPages";

export const useAuth = () => {
    const router = useAdminRouter();
    const pathname = usePathname() ?? "";
    const queryClient = useQueryClient();
    const { user, token, logout } = useAuthStore();
    const [isCompletingAuth, setIsCompletingAuth] = useState(false);

    const redirectAfterAuth = (destination: string) => {
        setIsCompletingAuth(true);
        prefetchAdminDestination(destination, router.prefetch);
        router.replace(destination);
    };

    const loginMutation = useMutation({
        mutationFn: (data: LoginFormValues) => authService.login({ ...data, rememberMe: false }),
        onSuccess: async (response: LoginResponse) => {
            const isSuccess = response.isSuccess ?? response.success;
            const authData = response.data;
            const accessToken = authData?.access_token ?? authData?.accessToken;
            const expiresIn = authData?.expires_in ?? authData?.expiresIn;

            if (!isSuccess || !accessToken) {
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
                toast.error("Đăng nhập thành công nhưng không lấy được thông tin người dùng.");
                clearAdminAuthSession();
                return;
            }

            const roleCode = getUserRoleCode(userInfo);
            if (isRestrictedAdminRoleCode(roleCode)) {
                toast.error("Tài khoản này không có quyền truy cập vùng quản trị.");
                clearAdminAuthSession();
                return;
            }

            completeAdminLoginSession(queryClient, userInfo, accessToken, expiresIn);

            const destination = !userInfo.hasPassword
                ? ROUTES.ADMIN.AUTH.SETUP_PROFILE
                : ROUTES.ADMIN.DASHBOARD.SYSTEM;

            redirectAfterAuth(destination);

            if (!userInfo.hasPassword) {
                toast.info("Vui lòng thiết lập mật khẩu cho lần đăng nhập đầu tiên.");
            } else if (roleCode === USER_ROLES.ADMIN) {
                toast.success("Chào mừng Quản trị viên!");
            } else {
                toast.success("Đăng nhập thành công!");
            }
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            toast.error(error.response?.data?.message || "Lỗi đăng nhập.");
        },
    });

    const oauthCallbackMutation = useMutation({
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

            try {
                const meResponse = await userService.getMe();
                const meSuccess = meResponse.isSuccess ?? meResponse.success;
                const userInfo = meResponse.data;

                if (!meSuccess || !userInfo) {
                    toast.error("Xác thực Google thành công nhưng không lấy được thông tin người dùng.");
                    return;
                }

                const roleCode = getUserRoleCode(userInfo);
                if (!isClientCallback && isRestrictedAdminRoleCode(roleCode)) {
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

                toast.success("Xác thực Google thành công!");

                if (isClientCallback) {
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

                redirectAfterAuth(destination);
            } catch {
                toast.error("Xác thực Google thành công nhưng không lấy được thông tin người dùng.");
            }
        },
        onError: () => {
            sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
            sessionStorage.removeItem(STORAGE_KEYS.OAUTH_REDIRECT_URI);
            toast.error("Xác thực OAuth thất bại.");
            const isClientCallback = !pathname.startsWith(ROUTES.ADMIN.ROOT);
            router.push(isClientCallback ? "/login" : ROUTES.ADMIN.AUTH.LOGIN);
        },
    });

    return {
        user,
        token,
        isLoading: loginMutation.isPending || oauthCallbackMutation.isPending || isCompletingAuth,
        isRedirecting: isCompletingAuth,
        login: loginMutation.mutate,
        logout,
        handleOAuthCallback: oauthCallbackMutation.mutate,
        isLoginPending: loginMutation.isPending,
        isOAuthPending: oauthCallbackMutation.isPending,
    };
};
