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

const REFRESH_SKEW_MS = 60_000;
/** Prevent setTimeout(0) tight loops when JWT exp is missing or imminently stale. */
const MIN_PROACTIVE_REFRESH_MS = 30_000;

let refreshInFlight: Promise<string | null> | null = null;

/** Shared refresh used by proactive boot and axios 401 interceptor. */
export const refreshAccessSession = async (): Promise<string | null> => {
    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = (async () => {
        const { apiApp } = await import("./index");
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
    })().finally(() => {
        refreshInFlight = null;
    });

    return refreshInFlight;
};

/**
 * F5: cookie còn (7 ngày) nhưng JWT access có thể đã hết 15 phút.
 * Đổi access mới trước khi /me, tránh 401 đầu trang.
 * Không có access token vẫn thử refresh (cookie HttpOnly).
 */
export const restoreAccessSessionIfNeeded = () => {
    hydrateAccessTokenFromCookie();
    const token = resolveAccessToken();
    if (token && !isJwtExpiredOrStale(token, REFRESH_SKEW_MS)) {
        return Promise.resolve();
    }

    return refreshAccessSession().catch(() => {
        // Interceptor refresh-fail đã xóa session khi refresh-token trả 401.
    });
};

/** Gọi lại refresh ~1 phút trước khi JWT hết hạn — không đợi 401. */
export const msUntilAccessRefresh = (skewMs = REFRESH_SKEW_MS) => {
    const token = resolveAccessToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
        if (typeof payload.exp !== "number") {
            return MIN_PROACTIVE_REFRESH_MS;
        }
        const computed = payload.exp * 1000 - Date.now() - skewMs;
        return Math.max(MIN_PROACTIVE_REFRESH_MS, computed);
    } catch {
        return MIN_PROACTIVE_REFRESH_MS;
    }
};
