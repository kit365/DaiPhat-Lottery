import { apiApp } from "../../../../api";
import { GetMeResponse, SetupProfileResponse } from "../types/auth.type";
import { USER_ENDPOINTS } from "./auth.endpoints";
import { ApiResponse } from "../../../../types/api.type";
import { User } from "../../../../types/user.type";

const normalizeUserResponse = <T extends ApiResponse<any>>(response: T): T => {
    const normalized = response as any;
    normalized.isSuccess = normalized.isSuccess ?? normalized.success;
    normalized.success = normalized.success ?? normalized.isSuccess;

    if (normalized.data) {
        const user = normalized.data;
        normalized.data = {
            ...user,
            phone: user.phoneNumber || user.phone,
            fullName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || user.email,
            avatar: user.avatarUrl || user.avatar,
            status: user.status ? user.status.toUpperCase() : "PENDING",
        };
    }

    return normalized;
};

export const userService = {
    getMe: async (): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>(USER_ENDPOINTS.currentUser);
        return normalizeUserResponse(response.data);
    },
    setupProfile: async (data: any): Promise<SetupProfileResponse> => {
        const response = await apiApp.post<SetupProfileResponse>(USER_ENDPOINTS.setupProfile, data);
        return normalizeUserResponse(response.data);
    },
    uploadMyAvatar: async (file: File): Promise<ApiResponse<User>> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiApp.post<ApiResponse<User>>(USER_ENDPOINTS.currentUserAvatar, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return normalizeUserResponse(response.data);
    },
    deleteMyAvatar: async (): Promise<ApiResponse<User>> => {
        const response = await apiApp.delete<ApiResponse<User>>(USER_ENDPOINTS.currentUserAvatar);
        return normalizeUserResponse(response.data);
    }
};
