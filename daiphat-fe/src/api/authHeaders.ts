import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { useAuthStore } from '../stores/useAuthStore';

const isUsableToken = (token: string | null | undefined): token is string => {
    if (!token) return false;
    const trimmed = token.trim();
    return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null';
};

/**
 * Prefer the in-memory auth store token (survives short-lived cookie expiry),
 * then fall back to the access-token cookie.
 */
export const resolveAccessToken = (): string | null => {
    const storeToken = useAuthStore.getState().token;
    if (isUsableToken(storeToken)) {
        return storeToken.trim();
    }
    const cookieToken = Cookies.get(STORAGE_KEYS.TOKEN);
    return isUsableToken(cookieToken) ? cookieToken.trim() : null;
};

/** Axios config fragment — omit Authorization when no token (avoid `Bearer undefined`). */
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
