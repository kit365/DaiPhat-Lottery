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
import { QUERY_KEYS } from "../../../../constants/queryKeys";

export const useAuth = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { token, user, set, login: loginStore, logout, openProfileSetupModal } = useAuthStore();

    const getMeQuery = useQuery({
        queryKey: [QUERY_KEYS.AUTH_ME, token],
        queryFn: userService.getMe,
        enabled: !!token,
        retry: false,
        staleTime: 1000 * 60 * 10,
    });

    useEffect(() => {
        if (getMeQuery.data) {
            const isSuccess = getMeQuery.data.isSuccess ?? getMeQuery.data.success;
            if (isSuccess && getMeQuery.data.data) {
                const userData = getMeQuery.data.data as User;

                if (JSON.stringify(user) !== JSON.stringify(userData)) {
                    set({ user: userData });
                }
            } else if (!isSuccess) {
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
        onSuccess: async (response: LoginResponse) => {
            const isSuccess = response.isSuccess ?? response.success;
            const authData = response.data;
            const accessToken = authData?.access_token ?? authData?.accessToken;
            const expiresIn = authData?.expires_in ?? authData?.expiresIn;

            if (isSuccess && accessToken) {
                const cookieOptions = {
                    expires: expiresIn ? expiresIn / 86400 : 7,
                    path: '/'
                };
                Cookies.set(STORAGE_KEYS.TOKEN, accessToken, cookieOptions);
                set({
                    token: accessToken,
                    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null
                });

                const meResponse = authData?.user
                    ? { isSuccess: true, success: true, message: "Success", data: authData.user }
                    : await userService.getMe();
                const meSuccess = meResponse.isSuccess ?? meResponse.success;
                const userInfo = meResponse.data;

                if (!meSuccess || !userInfo) {
                    toast.error("Đăng nhập thành công nhưng không lấy được thông tin người dùng.");
                    return;
                }

                const roleCode = userInfo.role?.code || "";
                if (roleCode === USER_ROLES.MEMBER || roleCode === USER_ROLES.STREET_AGENT) {
                    toast.error("Tài khoản này không có quyền truy cập vùng quản trị.");
                    logout();
                    Cookies.remove(STORAGE_KEYS.TOKEN, { path: '/' });
                    Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });
                    return;
                }

                loginStore(userInfo, accessToken, expiresIn);

                queryClient.setQueryData([QUERY_KEYS.AUTH_ME, accessToken], {
                    isSuccess: true,
                    success: true,
                    message: "Success",
                    data: userInfo
                });

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
        onSuccess: async (response) => {
            if (response?.access_token) {
                const { access_token, expires_in } = response;

                const cookieOptions = {
                    expires: expires_in ? expires_in / 86400 : 7,
                    path: '/'
                };

                Cookies.set(STORAGE_KEYS.TOKEN, access_token, cookieOptions);
                set({
                    token: access_token,
                    expiresAt: expires_in ? Date.now() + expires_in * 1000 : null
                });

                sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
                sessionStorage.removeItem(STORAGE_KEYS.OAUTH_REDIRECT_URI);

                const isClientCallback = !location.pathname.startsWith(ROUTES.ADMIN.ROOT);

                try {
                    const meResponse = await userService.getMe();
                    const meSuccess = meResponse.isSuccess ?? meResponse.success;
                    const userInfo = meResponse.data;

                    if (!meSuccess || !userInfo) {
                        toast.error("Xác thực Google thành công nhưng không lấy được thông tin người dùng.");
                        return;
                    }

                    const roleCode = userInfo.role?.code || "";
                    if (!isClientCallback && (roleCode === USER_ROLES.MEMBER || roleCode === USER_ROLES.STREET_AGENT)) {
                        toast.error("Tài khoản này không có quyền truy cập vùng quản trị.");
                        logout();
                        Cookies.remove(STORAGE_KEYS.TOKEN, { path: '/' });
                        Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: '/' });
                        return;
                    }

                    loginStore(userInfo, access_token, expires_in);
                    queryClient.setQueryData([QUERY_KEYS.AUTH_ME, access_token], {
                        isSuccess: true,
                        success: true,
                        message: 'Success',
                        data: userInfo
                    });
                    queryClient.setQueryData([QUERY_KEYS.CLIENT_ME, access_token], {
                        isSuccess: true,
                        success: true,
                        message: 'Success',
                        data: userInfo
                    });

                    toast.success("Xác thực Google thành công!");

                    if (isClientCallback) {
                        if (!userInfo.agreedToTerms) {
                            sessionStorage.setItem(STORAGE_KEYS.FORCE_PROFILE_SETUP, "true");
                        }

                        navigate(ROUTES.PUBLIC.HOME);
                        return;
                    }

                    if (!userInfo.hasPassword || !userInfo.agreedToTerms) {
                        navigate(ROUTES.ADMIN.AUTH.SETUP_PROFILE);
                    } else if (roleCode === USER_ROLES.ADMIN) {
                        navigate(ROUTES.ADMIN.DASHBOARD.SYSTEM);
                    } else {
                        navigate(ROUTES.ADMIN.MANAGEMENT.ROOT);
                    }
                } catch (error) {
                    toast.error("Xác thực Google thành công nhưng không lấy được thông tin người dùng.");
                }
            }
        },
        onError: () => {
            sessionStorage.removeItem(STORAGE_KEYS.PKCE_VERIFIER);
            sessionStorage.removeItem(STORAGE_KEYS.OAUTH_REDIRECT_URI);
            toast.error("Xác thực OAuth thất bại.");
            const isClientCallback = !location.pathname.startsWith(ROUTES.ADMIN.ROOT);
            navigate(isClientCallback ? "/login" : ROUTES.ADMIN.AUTH.LOGIN);
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
