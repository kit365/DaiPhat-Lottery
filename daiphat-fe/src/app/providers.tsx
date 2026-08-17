"use client";

import { StrictMode, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { AuthInitializer } from '../components/auth/AuthInitializer';
import { createAppQueryClient } from '@/shared/react-query/createAppQueryClient';
import { registerAppQueryClient } from '@/api/endAuthSession';
import { LuckyPatternPrefetcher } from '@/shared/lucky-number/LuckyPatternPrefetcher';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient();
    registerAppQueryClient(client);
    return client;
  });

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />
        <LuckyPatternPrefetcher />
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
