"use client";

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from './AuthGuard';
import { LayoutAdmin } from '@/admin/layouts/LayoutAdmin';
import { AdminSessionProvider } from '@/admin/context/AdminSessionProvider';
import '@/admin/constants/adminPrefetchRoutes';

export function AdminRouteGuardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/admin/auth');

  return (
    <Suspense fallback={null}>
      <AdminSessionProvider>
        {isAuthPage ? (
          children
        ) : (
          <LayoutAdmin>
            <AuthGuard>
              {children}
            </AuthGuard>
          </LayoutAdmin>
        )}
      </AdminSessionProvider>
    </Suspense>
  );
}
