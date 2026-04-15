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

// Biến để debounce Toast (tránh spam khi backend tèo)
let lastToastTime = 0;
const TOAST_DEBOUNCE_MS = 2000;

const showToastOnce = (msg: string, type: 'error' | 'success') => {
    const now = Date.now();
    if (now - lastToastTime > TOAST_DEBOUNCE_MS) {
        if (type === 'error') AppToast.error(msg);
        else AppToast.success(msg);
        lastToastTime = now;
    }
}

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
                        showToastOnce("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!", 'error');
                    }
                    if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/auth/login')) {
                        window.location.href = '/admin/auth/login';
                    }
                    break;
                case 403:
                    AppToast.error("Bạn không có quyền thực hiện hành động này!");
                    break;
                case 404:
                    AppToast.error("Không tìm thấy tài nguyên yêu cầu!");
                    break;
                case 500:
                    showToastOnce("Lỗi hệ thống! Vui lòng thử lại sau.", 'error');
                    break;
                default:
                    console.warn(`[API Error] ${status}: ${message}`);
            }
        } else {
            showToastOnce("Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng!", 'error');
        }

        return Promise.reject(error);
    }
);

export { apiApp }