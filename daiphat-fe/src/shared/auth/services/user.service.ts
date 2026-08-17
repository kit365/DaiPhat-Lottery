import { apiApp } from '@/api';
import type { GetMeResponse, SetupProfileResponse } from '../types/auth.type';
import { USER_ENDPOINTS } from './auth.endpoints';
import type { ApiResponse } from '@/types/api.type';
import type { User } from '@/types/user.type';
import { normalizeUserRecord, normalizeUserResponse } from '../utils/normalizeAuthResponse';

export const userService = {
    getMe: async (accessToken?: string): Promise<GetMeResponse> => {
        const response = await apiApp.get<GetMeResponse>(USER_ENDPOINTS.currentUser, {
            ...(accessToken
                ? { headers: { Authorization: `Bearer ${accessToken}` }, skipGlobalErrorToast: true }
                : {}),
        });
        const payload = response.data;
        const user = (payload?.data || payload) as Record<string, unknown> | undefined;
        if (payload && user) {
            payload.data = normalizeUserRecord(user);
        }
        return normalizeUserResponse(payload);
    },

    setupProfile: async (data: Record<string, unknown>): Promise<SetupProfileResponse> => {
        const response = await apiApp.post<SetupProfileResponse>(USER_ENDPOINTS.setupProfile, data);
        return normalizeUserResponse(response.data);
    },

    uploadMyAvatar: async (file: File): Promise<ApiResponse<User>> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiApp.post<ApiResponse<User>>(USER_ENDPOINTS.currentUserAvatar, formData);
        return normalizeUserResponse(response.data);
    },

    deleteMyAvatar: async (): Promise<ApiResponse<User>> => {
        const response = await apiApp.delete<ApiResponse<User>>(USER_ENDPOINTS.currentUserAvatar);
        return normalizeUserResponse(response.data);
    },
};
