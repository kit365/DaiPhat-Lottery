/**
 * Factory query key theo scope — dùng khi feature có nhiều list/detail
 * và cần invalidateQueries theo prefix.
 *
 * Ví dụ scope = 'import-batch':
 *   all          → ['import-batch']           invalidate cả feature
 *   lists()      → ['import-batch', 'list']    mọi list
 *   list(params) → ['import-batch', 'list', …]  một list cụ thể
 *   details()    → ['import-batch', 'detail']  mọi detail
 *   detail(id)   → ['import-batch', 'detail', id]
 *
 * Key đơn giản (vd. client-me) viết tay trong constants/queryKeys.ts là đủ.
 */
export const createQueryKeyScope = (scope: string) => {
    const all = [scope] as const;

    return {
        all,
        lists: () => [...all, 'list'] as const,
        list: (...params: unknown[]) => [...all, 'list', ...params] as const,
        details: () => [...all, 'detail'] as const,
        detail: (id?: string | number | null) => [...all, 'detail', id ?? undefined] as const,
        custom: (suffix: string, ...params: unknown[]) => [...all, suffix, ...params] as const,
    };
};
