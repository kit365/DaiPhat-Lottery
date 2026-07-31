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
    kind: "image" | "video";
}

const getCloudinaryUploadUrl = (file: File) => {
    const baseUrl = String(CLOUDINARY_URL || "");
    if (!baseUrl) return baseUrl;

    if (file.type.startsWith("video/")) {
        if (baseUrl.includes("/video/upload")) return baseUrl;
        if (baseUrl.includes("/image/upload")) return baseUrl.replace("/image/upload", "/video/upload");
        if (baseUrl.includes("/auto/upload")) return baseUrl.replace("/auto/upload", "/video/upload");
    }

    if (baseUrl.includes("/image/upload")) return baseUrl;
    if (baseUrl.includes("/video/upload")) return baseUrl.replace("/video/upload", "/image/upload");
    if (baseUrl.includes("/auto/upload")) return baseUrl.replace("/auto/upload", "/image/upload");
    return baseUrl;
};

export const uploadMediaToCloudinary = async (files: File[]): Promise<UploadedCloudinaryMedia[]> => {
    try {
        const uploadPromises = files.map(async (file) => {
            const uploadUrl = getCloudinaryUploadUrl(file);
            
            // Fallback for local testing without Cloudinary setup
            if (!uploadUrl) {
                console.warn("VITE_CLOUDINARY_URL is missing, mocking image upload with local object URL.");
                await new Promise(resolve => setTimeout(resolve, 1000));
                return {
                    url: URL.createObjectURL(file),
                    kind: file.type.startsWith("video/") ? "video" as const : "image" as const,
                };
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", UPLOAD_PRESET);

            const response = await axios.post(uploadUrl, formData);
            return {
                url: response.data.secure_url,
                kind: file.type.startsWith("video/") ? "video" as const : "image" as const,
            };
        });

        return await Promise.all(uploadPromises);
    } catch (error: any) {
        console.error(error.response?.data || error);
        throw new Error("Lỗi khi tải ảnh/video lên.");
    }
};

export const uploadImagesToCloudinary = async (files: File[]): Promise<string[]> => {
    const uploaded = await uploadMediaToCloudinary(files);
    return uploaded.map((item) => item.url);
};
