import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../../stores/useAuthStore";
import { toast } from "react-toastify";
import { ROUTES } from "../../../constants/routes";
import { USER_ROLES } from "../../../../constants/role.constants";
import { useEffect } from "react";
import { User } from "../../../../types/user.type";
import { LoginResponse } from "../types/auth.type";
import { LoginFormValues } from "../../../schemas/login.schema";
import Cookies from "js-cookie";
import { STORAGE_KEYS } from "../../../../constants/storage.constants";
import { QUERY_KEYS } from "../../../constants/queryKeys";

export const useAuth = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { token, user, set, login: loginStore, logout } = useAuthStore();

    const getMeQuery = useQuery({
        queryKey: [QUERY_KEYS.AUTH_ME, token],
        queryFn: userService.getMe,
        enabled: !!token,
        retry: false,
        staleTime: 1000 * 60 * 10,
    });

    useEffect(() => {
        if (getMeQuery.data) {
            const isSuccess = getMeQuery.data.isSuccess || getMeQuery.data.code === "SUCCESS";
            if (isSuccess && getMeQuery.data.data) {
                const userData = getMeQuery.data.data as User;

                const mappedUser = {
                    ...userData,
                    fullName: `${userData.firstName} ${userData.lastName}`.trim(),
                };

                if (JSON.stringify(user) !== JSON.stringify(mappedUser)) {
                    set({ user: mappedUser });
                }
            } else if (!isSuccess && getMeQuery.data.code === "UNAUTHORIZED") {
                logout();
            }
        }
    }, [getMeQuery.data, set, user, logout]);

    // Handle Auth Errors - Redirect to login on hard failures and CLEAR SESSION
    useEffect(() => {
        if (getMeQuery.isError) {
            // 1. Clear Zustand Store
            logout();

            // 2. Clear Cookies using unified keys
            Cookies.remove(STORAGE_KEYS.TOKEN, { path: '/' });
            Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });

            // 3. Redirect back to Login
            navigate(ROUTES.ADMIN.AUTH.LOGIN);
        }
    }, [getMeQuery.isError, logout, navigate]);

    const loginMutation = useMutation({
        mutationFn: (data: LoginFormValues) => authService.login({ ...data, rememberMe: false }),
        onSuccess: (response: LoginResponse) => {
            const isSuccess = response.isSuccess || response.success || response.code === "SUCCESS";
            if (isSuccess && response.data?.access_token) {
                const { access_token, user: userInfo } = response.data;
                if (userInfo) {
                    // 1. Save to Zustand (Common Store)
                    loginStore(userInfo, access_token, response.data.expires_in);

                    // 2. Seed React Query Cache to prevent redundant getMe call
                    queryClient.setQueryData([QUERY_KEYS.AUTH_ME, access_token], {
                        code: "SUCCESS",
                        isSuccess: true,
                        message: "Success",
                        data: userInfo
                    });
                    
                    // 3. Save to Cookies (Required for Admin APIs)
                    const cookieOptions = { 
                        expires: response.data.expires_in ? response.data.expires_in / 86400 : 7,
                        path: '/' 
                    };
                    Cookies.set(STORAGE_KEYS.TOKEN, access_token, cookieOptions);
                    if (response.data.refresh_token) {
                        Cookies.set(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh_token, cookieOptions);
                    }

                    const roleCode = userInfo.roles?.[0]?.code || "";
                    if (!userInfo.hasPassword) {
                        toast.info("Vui lòng thiết lập mật khẩu cho lần đăng nhập đầu tiên.");
                        navigate(ROUTES.ADMIN.AUTH.SETUP_PROFILE);
                    } else if (roleCode === USER_ROLES.ADMIN) {
                        toast.success("Chào mừng Quản trị viên!");
                        navigate(ROUTES.ADMIN.DASHBOARD.SYSTEM);
                    } else {
                        toast.success("Đăng nhập thành công!");
                        navigate(ROUTES.ADMIN.MANAGEMENT.ROOT);
                    }
                }
            } else {
                toast.error(response.message || "Đăng nhập thất bại.");
            }
        },
        onError: (error: { response?: { data?: { message?: string } } }) => {
            toast.error(error.response?.data?.message || "Lỗi đăng nhập.");
        }
    });

    const oauthCallbackMutation = useMutation({
        mutationFn: (params: { code: string; redirectUri: string; codeVerifier?: string }) =>
            authService.exchangeGoogleToken(params.code, params.redirectUri, params.codeVerifier),
        onSuccess: (response) => {
            if (response?.access_token) {
                const { access_token, expires_in } = response;
                
                // 1. Initial store setup with token - Trigger silent re-hydration
                set({ 
                    token: access_token, 
                    expiresAt: expires_in ? Date.now() + expires_in * 1000 : null 
                });
                
                // 2. Clear Google state from sessionStorage
                sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
                
                toast.success("Xác thực Google thành công!");

                // 3. Dynamic navigation based on context
                const isClientCallback = !location.pathname.startsWith(ROUTES.ADMIN.ROOT);
                if (isClientCallback) {
                    navigate(ROUTES.PUBLIC.HOME);
                } else {
                    navigate(ROUTES.ADMIN.DASHBOARD.ROOT);
                }
            }
        },
        onError: () => {
            toast.error("Xác thực OAuth thất bại.");
            navigate(ROUTES.ADMIN.AUTH.LOGIN);
        }
    });

    return {
        user,
        token,
        isLoading: getMeQuery.isLoading || loginMutation.isPending || oauthCallbackMutation.isPending,
        isUserLoading: getMeQuery.isLoading,
        isFetching: getMeQuery.isFetching,
        login: loginMutation.mutate,
        logout,
        getMe: getMeQuery.refetch,
        handleOAuthCallback: oauthCallbackMutation.mutate,
        isLoginPending: loginMutation.isPending,
        isOAuthPending: oauthCallbackMutation.isPending
    };
};
