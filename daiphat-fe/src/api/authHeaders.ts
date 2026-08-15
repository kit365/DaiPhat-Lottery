import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { useAuthStore } from '../stores/useAuthStore';

const ACCESS_COOKIE = { path: "/" as const };
const DEFAULT_TTL_SECONDS = 900;

const isUsableToken = (token: string | null | undefined): token is string => {
    if (!token) return false;
    const trimmed = token.trim();
    return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null';
};

export const readAccessTokenCookie = (): string | null => {
    if (typeof window === "undefined") return null;
    const cookieToken = Cookies.get(STORAGE_KEYS.TOKEN);
    return isUsableToken(cookieToken) ? cookieToken.trim() : null;
};

/**
 * Access JWT (Bearer). Refresh HttpOnly không nằm đây.
 *
 * Nguồn:
 *   Cookie JS `token` — sống sau F5, middleware /admin
 *   Zustand RAM      — đang dùng app (không persist localStorage)
 *
 * resolve: RAM trước, thiếu thì cookie.
 */
export const resolveAccessToken = (): string | null => {
    const storeToken = useAuthStore.getState().token;
    if (isUsableToken(storeToken)) {
        return storeToken.trim();
    }
    return readAccessTokenCookie();
};

/** Login / refresh: ghi cookie (reload + middleware) + RAM (gọi API). */
export const persistAccessToken = (accessToken: string, expiresIn?: number) => {
    const ttlSeconds = expiresIn && expiresIn > 0 ? expiresIn : DEFAULT_TTL_SECONDS;
    Cookies.set(STORAGE_KEYS.TOKEN, accessToken, {
        expires: Math.max(ttlSeconds, 60) / 86400,
        ...ACCESS_COOKIE,
    });
    useAuthStore.getState().set({
        token: accessToken,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });
};

/** F5: cookie → RAM nếu store trống. */
export const hydrateAccessTokenFromCookie = () => {
    const store = useAuthStore.getState();
    if (isUsableToken(store.token)) return;
    const cookieToken = readAccessTokenCookie();
    if (cookieToken) {
        store.set({ token: cookieToken });
    }
};

export const clearJsAuthCookies = () => {
    Cookies.remove(STORAGE_KEYS.TOKEN, ACCESS_COOKIE);
    Cookies.remove(STORAGE_KEYS.REFRESH_TOKEN, ACCESS_COOKIE);
};

/** Interceptor đã gắn Bearer — helper này trùng, chỗ cũ còn spread. */
export const withAuthHeaders = () => {
    const token = resolveAccessToken();
    if (!token) {
        return {};
    }
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};
