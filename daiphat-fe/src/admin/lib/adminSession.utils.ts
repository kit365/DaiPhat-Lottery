import Cookies from "js-cookie";
import type { QueryClient } from "@tanstack/react-query";

import type { GetMeResponse } from '@/shared/auth/types/auth.type';
import { QUERY_KEYS } from "@/constants/queryKeys";
import { STORAGE_KEYS } from "@/constants/storage.constants";
import { USER_ROLES } from "@/constants/role.constants";
import { useAuthStore } from "@/stores/useAuthStore";
import type { User } from "@/types/user.type";

const DEFAULT_TOKEN_TTL_SECONDS = 900;

export const adminMeQueryKey = (token: string | null) => [QUERY_KEYS.AUTH_ME, token] as const;

export function persistAdminAccessToken(accessToken: string, expiresIn?: number): number {
    const ttlSeconds = expiresIn && expiresIn > 0 ? expiresIn : DEFAULT_TOKEN_TTL_SECONDS;

    Cookies.set(STORAGE_KEYS.TOKEN, accessToken, {
        expires: Math.max(ttlSeconds, 60) / 86400,
        path: "/",
    });

    useAuthStore.getState().set({
        token: accessToken,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return ttlSeconds;
}

export function clearAdminAuthSession(): void {
    useAuthStore.getState().logout();
    Cookies.remove(STORAGE_KEYS.TOKEN, { path: "/" });
    Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, { path: "/" });
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
    useAuthStore.getState().login(userInfo, accessToken, expiresIn);
    seedAdminMeQuery(queryClient, accessToken, userInfo);
}

export function syncUserFromMeResponse(
    response: GetMeResponse | undefined,
    set: (state: Partial<{ user: User | null }>) => void,
    logout: () => void,
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
        logout();
    }
}

export function getUserRoleCode(user: User): string {
    return user.role?.code || "";
}

export function isRestrictedAdminRoleCode(roleCode: string): boolean {
    return roleCode === USER_ROLES.MEMBER || roleCode === USER_ROLES.STREET_AGENT;
}
