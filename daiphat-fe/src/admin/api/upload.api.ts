import { apiApp } from '../../api';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '../../constants/storage.constants';

const withAuth = () => {
    const token = Cookies.get(STORAGE_KEYS.TOKEN);
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

/** Upload ảnh lên Cloudinary qua backend (không cần cấu hình VITE_CLOUDINARY_* trên FE). */
export const uploadAdminImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiApp.post('/lottery-tickets/images/upload', formData, {
        ...withAuth(),
        headers: {
            ...withAuth().headers,
            'Content-Type': 'multipart/form-data',
        },
    });

    const url = response.data?.data?.url;
    if (!url) {
        throw new Error(response.data?.message || 'Không nhận được URL ảnh từ server');
    }
    return url;
};
