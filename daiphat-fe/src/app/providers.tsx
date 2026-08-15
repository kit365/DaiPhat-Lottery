"use client";

import { StrictMode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { AuthInitializer } from '../components/auth/AuthInitializer';
import { MUTATION_RETRY, QUERY_GC_TIME, QUERY_STALE_TIMES, queryRetryDelay, shouldRetryQuery } from '@/shared/react-query/queryPolicies';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_STALE_TIMES.default,
            gcTime: QUERY_GC_TIME,
            refetchOnWindowFocus: false,
            throwOnError: false,
            retry: shouldRetryQuery,
            retryDelay: queryRetryDelay,
          },
          mutations: {
            throwOnError: false,
            retry: MUTATION_RETRY,
          },
        },
      })
  );

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        {children}
        <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
          style={{ zIndex: 99999 }}
        />
      </QueryClientProvider>
    </StrictMode>
  );
}
