import Cookies from 'js-cookie';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Prefer the in-memory auth store token (survives short-lived cookie expiry),
 * then fall back to the access-token cookie.
 */
export const resolveAccessToken = (): string | null => {
    const storeToken = useAuthStore.getState().token;
    if (storeToken) {
        return storeToken;
    }
    const cookieToken = Cookies.get(STORAGE_KEYS.TOKEN);
    return cookieToken || null;
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
