"use client";

import { StrictMode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { AuthInitializer } from '../components/auth/AuthInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes staleTime
            gcTime: 1000 * 60 * 10, // 10 minutes cache time
            refetchOnWindowFocus: false,
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
