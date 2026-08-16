import type { QueryClient } from '@tanstack/react-query';
import { LOGOUT_PERSIST_QUERY_ROOTS } from '@/constants/queryKeys';
import { useAuthStore } from '../stores/useAuthStore';
import { clearJsAuthCookies } from './authHeaders';

type QueryLike = {
    queryKey: readonly unknown[];
    meta?: { persistOnLogout?: boolean };
};

/**
 * Cùng một QueryClient với Providers — không tạo client thứ hai.
 * Axios interceptor / sessionBoot không gọi được useQueryClient() nên
 * Providers gọi registerAppQueryClient(client) lúc boot, lưu reference tại đây.
 * Xóa store, cookie, cache private khi logout.
 */
let appQueryClient: QueryClient | null = null;

export const registerAppQueryClient = (client: QueryClient) => {
    appQueryClient = client;
};

const shouldKeepQuery = (query: QueryLike): boolean => {
    const persist = query.meta?.persistOnLogout;
    if (persist === true) {
        return true;
    }
    if (persist === false) {
        return false;
    }
    const root = query.queryKey[0];
    return typeof root === 'string' && LOGOUT_PERSIST_QUERY_ROOTS.has(root);
};

/** Xóa /me, đơn, chat… của user; mutation dở cũng bỏ. */
const clearPrivateQueries = () => {
    if (!appQueryClient) {
        return;
    }

    const isPrivate = (query: QueryLike) => !shouldKeepQuery(query);
    void appQueryClient.cancelQueries({ predicate: isPrivate });
    appQueryClient.removeQueries({ predicate: isPrivate });
    appQueryClient.getMutationCache().clear();
};

/** Logout: xóa store, cookie, cache private. */
export const endAuthSession = () => {
    useAuthStore.getState().logout();
    clearJsAuthCookies();
    clearPrivateQueries();
};
