import { apiApp } from '@/api';
import type { InternalAxiosRequestConfig } from 'axios';

type UploadRequestConfig = InternalAxiosRequestConfig & {
    skipGlobalErrorToast?: boolean;
};

/** Upload ảnh lên storage qua backend (Cloudinary hoặc local filesystem). */
export const uploadAdminImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiApp.post('/lottery-tickets/images/upload', formData, {
        // Large receipt photos can exceed the default 15s API timeout.
        timeout: 60_000,
        // Callers show their own toast; avoid duplicate "server busy" toasts.
        skipGlobalErrorToast: true,
    } as UploadRequestConfig);
    const url = response.data?.data?.url;
    if (!url) {
        throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
    }
    return url;
};
