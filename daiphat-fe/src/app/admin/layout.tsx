"use client";

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';
import { AuthGuard } from '@/admin/components/auth/AuthGuard';
import { LayoutAdmin } from '@/admin/layouts/LayoutAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/admin/auth');

  return (
    <div className="admin-theme min-h-screen text-inherit font-inherit">
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
    </div>
  );
}

