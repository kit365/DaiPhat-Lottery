/**
 * Axios dùng chung toàn app (`apiApp`).
 * 1. Tạo instance: baseURL, timeout, cookie (withCredentials).
 * 2. Request: gắn Bearer, bỏ Content-Type khi upload FormData.
 * 3. Response: refresh token khi 401 (hàng đợi, tránh gọi refresh song song),
 *    toast lỗi tập trung, xóa session khi hết hạn.
 *
 * Không phải React Query. QueryClient chỉ cache/retry;
 * mọi HTTP đều đi qua đây nên toast global nằm interceptor, không nằm QueryCache.
 *
 * Gọi API: `skipGlobalErrorToast: true` trên config nếu poll/public — tránh spam toast.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "../stores/useAuthStore"
import { API_PREFIX, API_VERSION } from "./api.constants"
import { AppToast } from "../utils/toast.util"
import Cookies from "js-cookie"
import { STORAGE_KEYS } from "../constants/storage.constants"
import { resolveAccessToken } from "./authHeaders"

/*
 * Có NEXT_PUBLIC_API_BASE_URL → Axios gọi thẳng URL đó.
 * Không có / rỗng → "" (same-origin /api) → Next rewrite sang Spring (BACKEND_UPSTREAM).
 */
const getBaseUrl = () => {
    if (typeof process !== "undefined" && process.env) {
        return process.env.NEXT_PUBLIC_API_BASE_URL || "";
    }
    return "";
};
const BASE_URL = getBaseUrl();
const API_ROOT = `${BASE_URL}${API_PREFIX}${API_VERSION}`

const apiApp = axios.create({
    baseURL: API_ROOT,
    // /users/me không được treo vô hạn — admin sẽ kẹt màn loading.
    timeout: 15_000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420"
    }
})

type ApiRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
    /** Không toast (poll, public, refresh). */
    skipGlobalErrorToast?: boolean;
};

/** Gắn token; bỏ qua login/register/refresh. */
apiApp.interceptors.request.use((config) => {
    const url = config.url || "";
    const isPublicAuth =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/google") ||
        url.includes("/auth/refresh-token") ||
        url.includes("/auth/forgot-password") ||
        url.includes("/auth/verify-email");

    if (!isPublicAuth) {
        const token = resolveAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // Tránh header `Bearer undefined` từ helper cookie-only.
            const existing = String(config.headers.Authorization || "");
            if (!existing || existing.includes("undefined") || existing.includes("null")) {
                if (typeof config.headers.delete === "function") {
                    config.headers.delete("Authorization");
                } else {
                    delete (config.headers as Record<string, unknown>).Authorization;
                }
            }
        }
    }

    // Upload FormData: xóa Content-Type để browser tự set multipart + boundary. Set tay sẽ 400.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        const headers = config.headers as { delete?: (name: string) => void } & Record<string, unknown>;
        if (typeof headers.delete === "function") {
            headers.delete("Content-Type");
        } else {
            delete headers["Content-Type"];
            delete headers["content-type"];
        }
    }

    return config;
});

interface PendingRequest {
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
}

let isRefreshing = false;
/** Các request 401 trong lúc đang refresh — chờ token mới rồi gọi lại. */
let failedQueue: PendingRequest[] = [];

/** API bắt buộc đăng nhập — 403 thì coi như hết phiên, không chỉ toast. */
const AUTH_REQUIRED_PATHS = [
    "/users/me",
    "/notifications/me",
    "/orders/my-orders",
    "/orders/my-tickets",
    "/transactions/",
];

const clearAuthSession = () => {
    const authStore = useAuthStore.getState();
    authStore.logout();
    Cookies.remove(STORAGE_KEYS.TOKEN, { path: "/" });
    Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: "/" });
};

/** Login / refresh — không chạy vòng refresh token. */
const isAuthEndpoint = (url?: string) => {
    if (!url) {
        return false;
    }

    return url.includes("/auth/login") || url.includes("/auth/refresh-token");
};

/** Đổi/reset mật khẩu thành công → xóa session hiện tại. */
const revokesCurrentSession = (url?: string) => {
    if (!url) {
        return false;
    }

    return url.includes("/auth/change-password") || url.includes("/auth/forgot-password/reset");
};

const isAuthRequiredRequest = (url?: string) => {
    if (!url) {
        return false;
    }

    return AUTH_REQUIRED_PATHS.some((path) => url.includes(path));
};

/** GET public (branding, config) — fail im lặng, không toast. */
const isPublicReadEndpoint = (url?: string) => {
    if (!url) {
        return false;
    }

    return url.includes('/public/');
};

const handleExpiredSession = (showToast: boolean = true) => {
    clearAuthSession();

    if (showToast) {
        AppToast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
    }
};

const persistAccessToken = (accessToken: string, expiresIn?: number) => {
    const authStore = useAuthStore.getState();
    const ttlSeconds = expiresIn && expiresIn > 0 ? expiresIn : 900;
    authStore.set({
        token: accessToken,
        expiresAt: Date.now() + ttlSeconds * 1000
    });

    Cookies.set(STORAGE_KEYS.TOKEN, accessToken, {
        expires: Math.max(ttlSeconds, 60) / 86400,
        path: "/"
    });
};

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

/** Thành công: đổi mật khẩu thì logout. Lỗi: 401 refresh + toast theo status. */
apiApp.interceptors.response.use(
    (response) => {
        if (revokesCurrentSession(response.config.url)) {
            clearAuthSession();
        }
        return response;
    },
    async (error: AxiosError) => {
        const { response } = error;
        const originalRequest = error.config as ApiRequestConfig | undefined;
        const skipToast = Boolean(originalRequest?.skipGlobalErrorToast)
            || isPublicReadEndpoint(originalRequest?.url);

        // Request bị hủy (Strict Mode / đổi route / poll restart) — không báo "mất mạng"
        if (axios.isCancel(error) || (error as AxiosError).code === "ERR_CANCELED") {
            return Promise.reject(error);
        }

        if (response) {
            const status = response.status;
            const message = (response.data as { message?: string } | undefined)?.message || "Đã có lỗi xảy ra từ máy chủ!";

            if (status === 401 && originalRequest && !originalRequest._retry) {
                // Poll/public 401: không refresh, không logout.
                if (skipToast) {
                    return Promise.reject(error);
                }

                // Login/refresh 401: trả lỗi BE, không vòng refresh.
                if (isAuthEndpoint(originalRequest.url)) {
                    // Sai mật khẩu: không xóa session. Refresh fail: xóa session.
                    if (originalRequest.url?.includes('/auth/refresh-token')) {
                        clearAuthSession();
                    }
                    return Promise.reject(error);
                }

                if (isRefreshing) {
                    return new Promise<string | null>((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                    .then(token => {
                        if (token) {
                            originalRequest._retry = true;
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return apiApp(originalRequest);
                        }
                        return Promise.reject(error);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
                }

                originalRequest._retry = true;
                isRefreshing = true;

                return new Promise((resolve, reject) => {
                    apiApp.post('/auth/refresh-token', null, { skipGlobalErrorToast: true } as ApiRequestConfig)
                        .then(({ data }) => {
                            const newAccessToken = data?.data?.accessToken || data?.data?.access_token;
                            const expiresIn = data?.data?.expiresIn || data?.data?.expires_in;

                            if (newAccessToken) {
                                persistAccessToken(newAccessToken, expiresIn);
                                processQueue(null, newAccessToken);
                                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                                resolve(apiApp(originalRequest));
                            } else {
                                handleExpiredSession(!skipToast);
                                reject(new Error("No access token returned"));
                            }
                        })
                        .catch((err) => {
                            processQueue(err, null);
                            handleExpiredSession(false);
                            reject(err);
                        })
                        .finally(() => {
                            isRefreshing = false;
                        });
                });
            }

            if (skipToast) {
                return Promise.reject(error);
            }

            if (status === 403 && isAuthRequiredRequest(originalRequest?.url)) {
                handleExpiredSession();
                return Promise.reject(error);
            }

            switch (status) {
                case 401: {
                    // Tới đây = đã retry refresh rồi vẫn 401.
                    if (!isAuthEndpoint(originalRequest?.url)) {
                        handleExpiredSession();
                    }
                    break;
                }
                case 403:
                    AppToast.error(message, { toastId: `api-error-403-${message}` });
                    break;
                case 400:
                case 422:
                case 429:
                    AppToast.error(message, { toastId: `api-error-${status}-${message}` });
                    break;
                case 404:
                    AppToast.error("Không tìm thấy tài nguyên yêu cầu!", { toastId: "api-error-404" });
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    AppToast.error("Máy chủ đang bảo trì hoặc quá tải. Vui lòng thử lại sau!", { toastId: "api-server-error" });
                    break;
                default:
                    AppToast.error(message, { toastId: `api-error-default-${message}` });
                    console.warn(`[API Error] ${status}: ${message}`);
            }
        } else if (!skipToast) {
            AppToast.error("Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng!", {
                toastId: "api-network-unreachable",
            });
        }

        return Promise.reject(error);
    }
);

export { apiApp }
