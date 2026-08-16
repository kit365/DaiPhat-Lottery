import { skipToken, type QueryFunction, type QueryFunctionContext, type QueryKey } from '@tanstack/react-query';
import { runWithQueryAbortSignal } from './bindQueryAbortSignal';

const QUERY_ABORT_WRAPPED = Symbol('queryAbortWrapped');

type MaybeQueryFn<TQueryFnData, TQueryKey extends QueryKey> =
    | QueryFunction<TQueryFnData, TQueryKey>
    | typeof skipToken
    | undefined;

export const wrapQueryFn = <TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
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

export const wrapQueryOptions = <T extends { queryFn?: unknown }>(options: T): T => {
    if (!options || typeof options !== 'object') {
        return options;
    }

    return {
        ...options,
        queryFn: wrapQueryFn(options.queryFn as MaybeQueryFn<unknown, QueryKey>),
    };
};
