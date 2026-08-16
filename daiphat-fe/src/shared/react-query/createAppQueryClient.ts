import { QueryCache, QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { wrapQueryOptions } from './wrapQueryFn';

/**
 * Every useQuery / prefetch goes through QueryCache.build. Wrap queryFn there
 * so Axios can read React Query's AbortSignal without touching each hook.
 */
export const createAppQueryClient = (config?: QueryClientConfig): QueryClient => {
    const queryCache = config?.queryCache ?? new QueryCache();
    const originalBuild = queryCache.build.bind(queryCache);
    queryCache.build = ((client, options, state) =>
        originalBuild(client, wrapQueryOptions(options), state)) as typeof queryCache.build;

    return new QueryClient({
        ...config,
        queryCache,
    });
};
