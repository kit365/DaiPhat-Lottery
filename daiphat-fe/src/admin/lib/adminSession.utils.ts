import type { QueryClient } from "@tanstack/react-query";

import type { GetMeResponse } from '@/shared/auth/types/auth.type';
import { persistAccessToken } from '@/api/authHeaders';
import { endAuthSession } from '@/api/endAuthSession';
import { QUERY_KEYS } from "@/constants/queryKeys";
import { USER_ROLES } from "@/constants/role.constants";
import { useAuthStore } from "@/stores/useAuthStore";
import type { User } from "@/types/user.type";

const DEFAULT_TOKEN_TTL_SECONDS = 900;

export const adminMeQueryKey = (token: string | null) => [QUERY_KEYS.AUTH_ME, token] as const;

export function persistAdminAccessToken(accessToken: string, expiresIn?: number): number {
    const ttlSeconds = expiresIn && expiresIn > 0 ? expiresIn : DEFAULT_TOKEN_TTL_SECONDS;
    persistAccessToken(accessToken, ttlSeconds);
    return ttlSeconds;
}

export function clearAdminAuthSession(): void {
    endAuthSession();
}

export function seedAdminMeQuery(queryClient: QueryClient, token: string, user: User): void {
    queryClient.setQueryData(adminMeQueryKey(token), {
        isSuccess: true,
        success: true,
        message: "Success",
        data: user,
    } satisfies GetMeResponse);
}

export function completeAdminLoginSession(
    queryClient: QueryClient,
    userInfo: User,
    accessToken: string,
    expiresIn?: number,
): void {
    persistAccessToken(accessToken, expiresIn);
    useAuthStore.getState().login(userInfo, accessToken, expiresIn);
    seedAdminMeQuery(queryClient, accessToken, userInfo);
}

export function syncUserFromMeResponse(
    response: GetMeResponse | undefined,
    set: (state: Partial<{ user: User | null }>) => void,
): void {
    if (!response || !useAuthStore.getState().token) {
        return;
    }

    const isSuccess = response.isSuccess ?? response.success;
    if (isSuccess && response.data) {
        const userData = response.data;
        const currentUser = useAuthStore.getState().user;

        if (JSON.stringify(currentUser) !== JSON.stringify(userData)) {
            set({ user: userData });
        }
        return;
    }

    if (!isSuccess) {
        endAuthSession();
    }
}

export function getUserRoleCode(user: User): string {
    return user.role?.code || "";
}

export function isRestrictedAdminRoleCode(roleCode: string): boolean {
    return roleCode === USER_ROLES.MEMBER || roleCode === USER_ROLES.STREET_AGENT;
}
