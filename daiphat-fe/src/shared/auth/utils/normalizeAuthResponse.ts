import type { ApiResponse } from '@/types/api.type';
import type { User } from '@/types/user.type';

type AuthPayload = Record<string, unknown>;

/** Chuẩn hóa isSuccess/success và snake_case token fields từ BE. */
export const normalizeApiResponse = <T extends ApiResponse<unknown>>(response: T): T => {
    const normalized = response as T & { isSuccess?: boolean; success?: boolean; data?: AuthPayload };
    normalized.isSuccess = normalized.isSuccess ?? normalized.success;
    normalized.success = normalized.success ?? normalized.isSuccess;

    if (normalized.data) {
        normalized.data.access_token = normalized.data.access_token ?? normalized.data.accessToken;
        normalized.data.expires_in = normalized.data.expires_in ?? normalized.data.expiresIn;
        normalized.data.refresh_token = normalized.data.refresh_token ?? normalized.data.refreshToken;
        normalized.data.token_type = normalized.data.token_type ?? normalized.data.tokenType;
    }

    return normalized;
};

export const normalizeUserRecord = (user: Record<string, unknown>): User =>
    ({
        ...user,
        phone: user.phoneNumber || user.phone,
        fullName:
            user.fullName ||
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.username ||
            user.email,
        avatar: user.avatarUrl || user.avatar,
        status: user.status ? String(user.status).toUpperCase() : 'PENDING',
    }) as User;

export const normalizeUserResponse = <T extends ApiResponse<unknown>>(response: T): T => {
    const normalized = normalizeApiResponse(response);
    const data = normalized.data as AuthPayload | undefined;

    if (data) {
        normalized.data = normalizeUserRecord(data) as T['data'];
    }

    return normalized;
};
