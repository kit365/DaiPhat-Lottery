"use client";

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from './AuthGuard';
import { LayoutAdmin } from '@/admin/layouts/LayoutAdmin';
import { AdminSessionProvider } from '@/admin/context/AdminSessionProvider';
import { ROUTES } from '@/admin/constants/routes';
import '@/admin/constants/adminPrefetchRoutes';

export function AdminRouteGuardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/admin/auth');
  const isSetupProfilePage = pathname === ROUTES.ADMIN.AUTH.SETUP_PROFILE;

  return (
    <Suspense fallback={null}>
      <AdminSessionProvider>
        {isAuthPage ? (
          children
        ) : isSetupProfilePage ? (
          <AuthGuard>
            {children}
          </AuthGuard>
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
