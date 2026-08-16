import {
    QueryCache,
    skipToken,
    type QueryFunction,
    type QueryFunctionContext,
    type QueryKey,
} from '@tanstack/react-query';

/**
 * Pattern global: gắn AbortSignal của React Query vào mọi GET (Axios) tự động.
 *
 * Vì sao cần: service gọi apiApp.get() qua interceptor, không truyền signal tay
 * từng hook. Patch QueryCache.build một lần → mọi useQuery/prefetch đều cancel
 * được mà không sửa hàng trăm file.
 *
 * Cancel request khi:
 * - Chuyển trang / unmount component (không còn observer)
 * - Đổi queryKey (filter, pagination, id detail, tab…)
 * - enabled: false trong lúc đang fetch
 * - Fetch mới thay fetch cũ (invalidate, refetch tay, refetch chồng)
 * - cancelQueries / removeQueries (vd. logout)
 *
 * Không cancel: mutation (submit form) — không đi QueryCache.build.
 *
 * Luồng:
 * 1. useQuery/prefetch → QueryCache.build (patch bên dưới)
 * 2. wrapQueryOptions bọc queryFn, set context.signal qua runWithQueryAbortSignal
 * 3. Interceptor Axios (api/index.ts) đọc peekQueryAbortSignal() → config.signal
 */

let currentQueryAbortSignal: AbortSignal | undefined;

/** Đọc signal của query đang chạy — chỉ dùng trong interceptor Axios. */
export const peekQueryAbortSignal = (): AbortSignal | undefined => currentQueryAbortSignal;

const runWithQueryAbortSignal = <T>(signal: AbortSignal | undefined, fn: () => T): T => {
    const previous = currentQueryAbortSignal;
    currentQueryAbortSignal = signal;
    try {
        return fn();
    } finally {
        currentQueryAbortSignal = previous;
    }
};

const QUERY_ABORT_WRAPPED = Symbol('queryAbortWrapped');

type MaybeQueryFn<TQueryFnData, TQueryKey extends QueryKey> =
    | QueryFunction<TQueryFnData, TQueryKey>
    | typeof skipToken
    | undefined;

const wrapQueryFn = <TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
    queryFn: MaybeQueryFn<TQueryFnData, TQueryKey>
): MaybeQueryFn<TQueryFnData, TQueryKey> => {
    if (!queryFn || queryFn === skipToken) {
        return queryFn;
    }

    if (QUERY_ABORT_WRAPPED in queryFn) {
        return queryFn;
    }

    const wrapped: QueryFunction<TQueryFnData, TQueryKey> = (context: QueryFunctionContext<TQueryKey>) =>
        runWithQueryAbortSignal(context.signal, () => queryFn(context));

    Object.defineProperty(wrapped, QUERY_ABORT_WRAPPED, { value: true });
    return wrapped;
};

const wrapQueryOptions = <T extends { queryFn?: unknown }>(options: T): T => {
    if (!options || typeof options !== 'object') {
        return options;
    }

    return {
        ...options,
        queryFn: wrapQueryFn(options.queryFn as MaybeQueryFn<unknown, QueryKey>),
    };
};

/** QueryCache đã patch build — mọi query tự gắn AbortSignal, không cần sửa từng useQuery. */
export const createAbortAwareQueryCache = (): QueryCache => {
    const queryCache = new QueryCache();
    const originalBuild = queryCache.build.bind(queryCache);
    queryCache.build = ((client, options, state) =>
        originalBuild(client, wrapQueryOptions(options), state)) as typeof queryCache.build;
    return queryCache;
};
