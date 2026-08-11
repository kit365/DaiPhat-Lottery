import axios from 'axios';

const getEnvVar = (key: string) => {
    if (typeof process !== 'undefined' && process.env) {
        return process.env[`NEXT_PUBLIC_${key}`] || process.env[`VITE_${key}`] || '';
    }
    return '';
};

const UPLOAD_PRESET = getEnvVar('UPLOAD_PRESET');
const CLOUDINARY_URL = getEnvVar('CLOUDINARY_URL');

export interface UploadedCloudinaryMedia {
    url: string;
    kind: 'image' | 'video';
}

const getCloudinaryUploadUrl = (file: File) => {
    const baseUrl = String(CLOUDINARY_URL || '');
    if (!baseUrl) return baseUrl;

    if (file.type.startsWith('video/')) {
        if (baseUrl.includes('/video/upload')) return baseUrl;
        if (baseUrl.includes('/image/upload')) return baseUrl.replace('/image/upload', '/video/upload');
        if (baseUrl.includes('/auto/upload')) return baseUrl.replace('/auto/upload', '/video/upload');
    }

    if (baseUrl.includes('/image/upload')) return baseUrl;
    if (baseUrl.includes('/video/upload')) return baseUrl.replace('/video/upload', '/image/upload');
    if (baseUrl.includes('/auto/upload')) return baseUrl.replace('/auto/upload', '/image/upload');
    return baseUrl;
};

const assertPersistableMediaUrl = (url: unknown): string => {
    if (typeof url !== 'string' || !url.trim()) {
        throw new Error('Không nhận được URL ảnh từ Cloudinary.');
    }
    const trimmed = url.trim();
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
        throw new Error(
            'URL ảnh tạm thời không thể lưu. Cấu hình NEXT_PUBLIC_CLOUDINARY_URL và NEXT_PUBLIC_UPLOAD_PRESET (hoặc VITE_*).',
        );
    }
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
        throw new Error('URL ảnh không hợp lệ. Vui lòng tải lại ảnh.');
    }
    return trimmed;
};

export const uploadMediaToCloudinary = async (files: File[]): Promise<UploadedCloudinaryMedia[]> => {
    try {
        const uploadPromises = files.map(async (file) => {
            const uploadUrl = getCloudinaryUploadUrl(file);

            if (!uploadUrl || !UPLOAD_PRESET) {
                throw new Error(
                    'Chưa cấu hình Cloudinary (NEXT_PUBLIC_CLOUDINARY_URL / NEXT_PUBLIC_UPLOAD_PRESET). Không thể tải ảnh lên.',
                );
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            const response = await axios.post(uploadUrl, formData);
            const secureUrl = response.data?.secure_url || response.data?.url;
            return {
                url: assertPersistableMediaUrl(secureUrl),
                kind: file.type.startsWith('video/') ? ('video' as const) : ('image' as const),
            };
        });

        return await Promise.all(uploadPromises);
    } catch (error: unknown) {
        const axiosLike = error as { response?: unknown; message?: string };
        if (error instanceof Error && error.message && !axiosLike.response) {
            throw error;
        }
        throw new Error((error instanceof Error && error.message) || 'Lỗi khi tải ảnh/video lên.');
    }
};

export const uploadImagesToCloudinary = async (files: File[]): Promise<string[]> => {
    const uploaded = await uploadMediaToCloudinary(files);
    return uploaded.map((item) => item.url);
};
