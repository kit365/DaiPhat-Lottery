import { apiApp } from "./index";
import {
    clearJsAuthCookies,
    hydrateAccessTokenFromCookie,
    persistAccessToken,
    resolveAccessToken,
} from "./authHeaders";
import { useAuthStore } from "../stores/useAuthStore";

type RefreshBody = {
    data?: {
        accessToken?: string;
        access_token?: string;
        expiresIn?: number;
        expires_in?: number;
    };
};

const isJwtExpiredOrStale = (token: string, skewMs = 30_000) => {
    try {
        const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
        if (typeof payload.exp !== "number") return true;
        return payload.exp * 1000 <= Date.now() + skewMs;
    } catch {
        return true;
    }
};

let bootRefreshInFlight: Promise<void> | null = null;

/**
 * F5: cookie còn (7 ngày) nhưng JWT access có thể đã hết 15 phút.
 * Đổi access mới trước khi /me, tránh 401 đầu trang.
 */
export const restoreAccessSessionIfNeeded = () => {
    if (bootRefreshInFlight) return bootRefreshInFlight;

    bootRefreshInFlight = (async () => {
        hydrateAccessTokenFromCookie();
        const token = resolveAccessToken();
        if (!token || !isJwtExpiredOrStale(token)) return;

        try {
            const { data } = await apiApp.post<RefreshBody>("/auth/refresh-token", null, {
                skipGlobalErrorToast: true,
            });
            const newAccess = data?.data?.accessToken || data?.data?.access_token;
            const expiresIn = data?.data?.expiresIn ?? data?.data?.expires_in;
            if (newAccess) {
                persistAccessToken(newAccess, expiresIn);
            } else {
                useAuthStore.getState().logout();
                clearJsAuthCookies();
            }
        } catch {
            // Interceptor refresh-fail đã xóa session.
        }
    })().finally(() => {
        bootRefreshInFlight = null;
    });

    return bootRefreshInFlight;
};
