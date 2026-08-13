import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "../stores/useAuthStore"
import { API_PREFIX, API_VERSION } from "./api.constants"
import { AppToast } from "../utils/toast.util"
import Cookies from "js-cookie"
import { STORAGE_KEYS } from "../constants/storage.constants"
import { resolveAccessToken } from "./authHeaders"

// In dev (npm run dev), use empty BASE_URL so requests go through Vite/Next proxy.
// This makes them same-origin → browser sends HttpOnly cookies (incl. refresh_token).
// In production, VITE_API_BASE_URL / NEXT_PUBLIC_API_BASE_URL is set to the actual backend URL.
const getBaseUrl = () => {
    if (typeof process !== "undefined" && process.env) {
        return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || "";
    }
    return "";
};
const BASE_URL = getBaseUrl();
const API_ROOT = `${BASE_URL}${API_PREFIX}${API_VERSION}`

const apiApp = axios.create({
    baseURL: API_ROOT,
    // Auth guards depend on /users/me. Without a deadline a stalled proxy or
    // backend connection leaves the whole admin area on its loading screen.
    timeout: 15_000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420"
    }
})

type ApiRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
    skipGlobalErrorToast?: boolean;
};

// Request Interceptor: Attach Token (skip public auth endpoints)
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
            // Drop stale `Bearer undefined` from cookie-only withAuth helpers.
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

    // Instance default is application/json. For FormData uploads we must clear
    // Content-Type so the browser/axios can set multipart/form-data with boundary.
    // Setting "multipart/form-data" manually (without boundary) causes Spring 400s.
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
let failedQueue: PendingRequest[] = [];

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

const isAuthEndpoint = (url?: string) => {
    if (!url) {
        return false;
    }

    return url.includes("/auth/login") || url.includes("/auth/refresh-token");
};

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

/** Public read-only endpoints should degrade silently (branding, static config, etc.). */
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
        // Keep cookie at least as long as the JWT; never use sub-minute TTL for the FE cookie.
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

// Response Interceptor: Handle Global Errors & 401
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
                // Background / optional reads should fail quietly without refresh storms or logout.
                if (skipToast) {
                    return Promise.reject(error);
                }

                // Skip refresh logic for auth endpoints (login, refresh-token itself)
                if (isAuthEndpoint(originalRequest.url)) {
                    // For login endpoint: just show the real error from backend
                    // Don't clear session, don't redirect, don't show "session expired"
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
                            // Missing/invalid refresh cookie used to 500 and spam "server error" toasts
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
                    // Don't clear session or show session expired for auth endpoints
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
