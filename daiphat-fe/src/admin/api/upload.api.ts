import { apiApp } from '../../api';
import { withAuthHeaders } from '../../api/authHeaders';

/** Upload ảnh lên storage qua backend (Cloudinary hoặc local filesystem). */
export const uploadAdminImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    // Do not set Content-Type manually — axios/browser must include the multipart boundary.
    const response = await apiApp.post('/lottery-tickets/images/upload', formData, {
        ...withAuthHeaders(),
    });

    const url = response.data?.data?.url;
    if (!url) {
        throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
    }
    return url;
};
