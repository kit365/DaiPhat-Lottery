import axios from 'axios';

const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET;
const CLOUDINARY_URL = import.meta.env.VITE_CLOUDINARY_URL;

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
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", UPLOAD_PRESET);

            const response = await axios.post(getCloudinaryUploadUrl(file), formData);
            return {
                url: response.data.secure_url,
                kind: file.type.startsWith("video/") ? "video" as const : "image" as const,
            };
        });

        return await Promise.all(uploadPromises);
    } catch (error: any) {
        console.error(error.response?.data);
        throw new Error("Lỗi khi tải ảnh/video lên.");
    }
};

export const uploadImagesToCloudinary = async (files: File[]): Promise<string[]> => {
    const uploaded = await uploadMediaToCloudinary(files);
    return uploaded.map((item) => item.url);
};
