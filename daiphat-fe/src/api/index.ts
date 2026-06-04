import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "../stores/useAuthStore"
import { API_PREFIX, API_VERSION } from "./api.constants"
import { AppToast } from "../client/utils/toast.util"

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_ROOT = `${BASE_URL}${API_PREFIX}${API_VERSION}`

const apiApp = axios.create({
    baseURL: API_ROOT,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
})

// Request Interceptor: Attach Token
apiApp.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

interface PendingRequest {
    resolve: (token: string | null) => void;
    reject: (error: any) => void;
}

let isRefreshing = false;
let failedQueue: PendingRequest[] = [];

const processQueue = (error: any, token: string | null = null) => {
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
        return response;
    },
    async (error: AxiosError) => {
        const { response } = error;
        const authStore = useAuthStore.getState();
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (response) {
            const status = response.status;
            const message = (response.data as any)?.message || "Đã có lỗi xảy ra từ máy chủ!";

            if (status === 401 && originalRequest && !originalRequest._retry) {
                // If the refresh request itself fails with 401, logout to prevent infinite loop
                if (originalRequest.url?.includes('/auth/refresh-token')) {
                    authStore.logout();
                    const isLoginPath = window.location.pathname.includes('/auth/login') || window.location.pathname.includes('/login');
                    if (isLoginPath) {
                        AppToast.error(message);
                    } else {
                        AppToast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
                    }
                    return Promise.reject(error);
                }

                if (isRefreshing) {
                    return new Promise<string | null>((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                    .then(token => {
                        if (token) {
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
                    apiApp.post('/auth/refresh-token')
                        .then(({ data }) => {
                            const newAccessToken = data?.data?.accessToken || data?.data?.access_token;
                            const expiresIn = data?.data?.expiresIn || data?.data?.expires_in;

                            if (newAccessToken && authStore.user) {
                                authStore.login(authStore.user, newAccessToken, expiresIn);
                                processQueue(null, newAccessToken);
                                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                                resolve(apiApp(originalRequest));
                            } else {
                                authStore.logout();
                                AppToast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
                                reject(new Error("No access token returned"));
                            }
                        })
                        .catch((err) => {
                            processQueue(err, null);
                            authStore.logout();
                            AppToast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
                            reject(err);
                        })
                        .finally(() => {
                            isRefreshing = false;
                        });
                });
            }

            switch (status) {
                case 401:
                    authStore.logout();
                    const isLoginPath = window.location.pathname.includes('/auth/login') || window.location.pathname.includes('/login');
                    if (isLoginPath) {
                        AppToast.error(message);
                    } else {
                        AppToast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
                    }
                    break;
                case 403:
                    AppToast.error(message);
                    break;
                case 400:
                case 422:
                case 429:
                    AppToast.error(message);
                    break;
                case 404:
                    AppToast.error("Không tìm thấy tài nguyên yêu cầu!");
                    break;
                case 500:
                    AppToast.error("Lỗi hệ thống! Vui lòng thử lại sau.");
                    break;
                default:
                    AppToast.error(message);
                    console.warn(`[API Error] ${status}: ${message}`);
            }
        } else {
            AppToast.error("Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng!");
        }

        return Promise.reject(error);
    }
);

export { apiApp }
