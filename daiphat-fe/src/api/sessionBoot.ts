import { apiApp } from "./index";
import {
    hydrateAccessTokenFromCookie,
    persistAccessToken,
    persistRefreshTokenFallback,
    resolveAccessToken,
} from "./authHeaders";
import { endAuthSession } from "./endAuthSession";

type RefreshBody = {
    data?: {
        accessToken?: string;
        access_token?: string;
        expiresIn?: number;
        expires_in?: number;
        refreshToken?: string;
        refresh_token?: string;
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

const REFRESH_SKEW_MS = 60_000;

export const refreshAccessSession = async (): Promise<string | null> => {
    const { data } = await apiApp.post<RefreshBody>("/auth/refresh-token", null, {
        skipGlobalErrorToast: true,
    });
    const newAccess = data?.data?.accessToken || data?.data?.access_token;
    const expiresIn = data?.data?.expiresIn ?? data?.data?.expires_in;
    if (!newAccess) {
        endAuthSession();
        return null;
    }
    persistAccessToken(newAccess, expiresIn);
    persistRefreshTokenFallback(data?.data?.refreshToken || data?.data?.refresh_token);
    return newAccess;
};

/**
 * F5: cookie còn (7 ngày) nhưng JWT access có thể đã hết 15 phút.
 * Đổi access mới trước khi /me, tránh 401 đầu trang.
 * Không có access token vẫn thử refresh (cookie HttpOnly).
 */
export const restoreAccessSessionIfNeeded = () => {
    if (bootRefreshInFlight) return bootRefreshInFlight;

    bootRefreshInFlight = (async () => {
        hydrateAccessTokenFromCookie();
        const token = resolveAccessToken();
        if (token && !isJwtExpiredOrStale(token, REFRESH_SKEW_MS)) return;

        try {
            await refreshAccessSession();
        } catch {
            // Interceptor refresh-fail đã xóa session.
        }
    })().finally(() => {
        bootRefreshInFlight = null;
    });

    return bootRefreshInFlight;
};

/** Gọi lại refresh ~1 phút trước khi JWT hết hạn — không đợi 401. */
export const msUntilAccessRefresh = (skewMs = REFRESH_SKEW_MS) => {
    const token = resolveAccessToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
        if (typeof payload.exp !== "number") return 0;
        return Math.max(0, payload.exp * 1000 - Date.now() - skewMs);
    } catch {
        return 0;
    }
};
