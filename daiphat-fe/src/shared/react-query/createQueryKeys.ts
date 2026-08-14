/** Query key factory — prefix `all` để invalidate theo scope. */
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
