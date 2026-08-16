/** Barrel React Query dùng chung — import từ đây thay vì @tanstack trực tiếp. */
export { createQueryKeyScope } from './createQueryKeys';
export {
    createAppQueryClient,
    QUERY_STALE_TIMES,
    listQueryDefaults,
    detailQueryDefaults,
} from './createAppQueryClient';

export {
    HydrationBoundary,
    QueryClient,
    QueryClientProvider,
    dehydrate,
    keepPreviousData,
    skipToken,
    useInfiniteQuery,
    useMutation,
    useQueries,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
export type { InfiniteData, UseQueryOptions } from '@tanstack/react-query';
