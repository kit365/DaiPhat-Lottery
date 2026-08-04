"use client";

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';
import { AuthGuard } from './AuthGuard';
import { LayoutAdmin } from '@/admin/layouts/LayoutAdmin';

export function AdminRouteGuardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/admin/auth');

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {isAuthPage ? (
        children
      ) : (
        <AuthGuard>
          <LayoutAdmin>
            {children}
          </LayoutAdmin>
        </AuthGuard>
      )}
    </Suspense>
  );
}
