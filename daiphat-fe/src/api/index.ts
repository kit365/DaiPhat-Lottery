/**
 * Axios dùng chung toàn app (`apiApp`).
 * React Query chỉ cache / retry UI — không gọi HTTP, không toast.
 *
 * Luồng:
 *
 *   UI  →  React Query (AbortSignal khi unmount / đổi queryKey)  →  apiApp
 *                                      │
 *                    có NEXT_PUBLIC_API_BASE_URL  →  gọi thẳng BE (local đừng set)
 *                    không có                     →  /api cùng origin FE
 *                                                      → Next rewrite → BE
 *                                      │
 *                               [Request]
 *                    gắn Bearer (trừ login / register / refresh / forgot / verify)
 *                    FormData: xóa Content-Type, để browser tự set
 *                                      │
 *                               [Response OK]
 *                    đổi / reset mật khẩu thành công → logout
 *                                      │
 *                               [Response lỗi]
 *                    request bị hủy (đổi trang, Strict Mode) → im lặng
 *                    /public/ hoặc skipGlobalErrorToast     → không toast, không refresh
 *                    401 login          → sai mật khẩu, nhập lại, giữ session
 *                    401 refresh-token  → phiên chết, xóa session, bắt login
 *                    401 API khác       → refresh 1 lần, hàng đợi, gọi lại request
 *                    refresh xong vẫn 401 → xóa session
 *                    lỗi khác           → toast theo HTTP status
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { peekQueryAbortSignal } from "@/shared/react-query/bindQueryAbortSignal"
import { useAuthStore } from "../stores/useAuthStore"
import { API_PREFIX, API_VERSION } from "./api.constants"
import { AppToast } from "../utils/toast.util"
import { persistAccessToken, resolveAccessToken, clearJsAuthCookies } from "./authHeaders"

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
    timeout: 15_000,
    withCredentials: true, // gửi cookie HttpOnly (refresh_token) khi same-origin
    headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "69420"
    }
})

// --- Request: gắn access token ---
apiApp.interceptors.request.use((config) => {
    const url = config.url || "";
    // Login / register / refresh: BE chưa cần Bearer (và refresh dùng cookie).
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

    if (!config.signal) {
        const querySignal = peekQueryAbortSignal();
        if (querySignal) {
            config.signal = querySignal;
        }
    }

    // Upload FormData: xóa Content-Type để browser tự set multipart + boundary.
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
// Nhiều API 401 cùng lúc: chỉ 1 refresh, các request còn lại xếp hàng.
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
    useAuthStore.getState().logout();
    clearJsAuthCookies();
};

const isAuthRequiredRequest = (url?: string) => {
    if (!url) {
        return false;
    }

    return AUTH_REQUIRED_PATHS.some((path) => url.includes(path));
};

const handleExpiredSession = (showToast: boolean = true) => {
    clearAuthSession();

    if (showToast) {
        AppToast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
    }
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

type ApiRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean; // đã refresh 1 lần cho request này — chặn vòng vô hạn
    skipGlobalErrorToast?: boolean; // poll / public: không toast
};

/** Đổi/reset mật khẩu thành công → xóa session hiện tại. */
const revokesCurrentSession = (url?: string) => {
    if (!url) {
        return false;
    }

    return url.includes("/auth/change-password") || url.includes("/auth/forgot-password/reset");
};

/** URL chứa /public/ — config site, không cần login. */
const isPublicReadEndpoint = (url?: string) => {
    if (!url) {
        return false;
    }

    return url.includes('/public/');
};

/** Login / refresh 401: không gọi refresh thêm (tránh vòng). */
const isAuthEndpoint = (url?: string) => {
    if (!url) {
        return false;
    }

    return url.includes("/auth/login") || url.includes("/auth/refresh-token");
};

// --- Response: refresh 401 + toast ---
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

        // Đổi trang / Strict Mode hủy request cũ — không báo mất mạng.
        if (axios.isCancel(error) || (error as AxiosError).code === "ERR_CANCELED") {
            return Promise.reject(error);
        }

        if (response) {
            const status = response.status;
            const message = (response.data as { message?: string } | undefined)?.message || "Đã có lỗi xảy ra từ máy chủ!";

            // Access token hết hạn: refresh 1 lần rồi gửi lại request.
            if (status === 401 && originalRequest && !originalRequest._retry) {
                if (skipToast) {
                    return Promise.reject(error);
                }

                if (isAuthEndpoint(originalRequest.url)) {
                    // login fail = nhập lại. refresh fail = bắt login lại.
                    if (originalRequest.url?.includes('/auth/refresh-token')) {
                        clearAuthSession();
                    }
                    return Promise.reject(error);
                }

                // Đang refresh: xếp hàng, xong mới gọi lại.
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
                    // Đã refresh 1 lần vẫn 401 → phiên hết.
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
