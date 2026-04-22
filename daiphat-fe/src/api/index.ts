import axios, { AxiosError } from "axios"
import { useAuthStore } from "../stores/useAuthStore"
import { API_PREFIX, API_VERSION } from "./api.constants"
import { AppToast } from "../client/utils/toast.util"

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
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

// Response Interceptor: Handle Global Errors & 401
apiApp.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        const { response } = error;
        const authStore = useAuthStore.getState();

        if (response) {
            const status = response.status;
            const message = (response.data as any)?.message || "Đã có lỗi xảy ra từ máy chủ!";

            switch (status) {
                case 401:
                    authStore.logout();
                    if (window.location.pathname.includes('/auth/login')) {
                        AppToast.error(message);
                    } else {
                        AppToast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
                    }
                    if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/auth/login')) {
                        window.location.href = '/admin/auth/login';
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
