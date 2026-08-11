import { apiApp } from '@/api';

/** Upload ảnh lên storage qua backend (Cloudinary hoặc local filesystem). */
export const uploadAdminImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiApp.post('/lottery-tickets/images/upload', formData);
    const url = response.data?.data?.url;
    if (!url) {
        throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
    }
    return url;
};
