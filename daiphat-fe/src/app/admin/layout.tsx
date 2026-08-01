"use client";

import { Suspense } from 'react';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';
import { AuthGuard } from '@/admin/components/auth/AuthGuard';
import { LayoutAdmin } from '@/admin/layouts/LayoutAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen text-inherit font-inherit">
      <Suspense fallback={<LoadingSpinner />}>
        <AuthGuard>
          <LayoutAdmin>
            {children}
          </LayoutAdmin>
        </AuthGuard>
      </Suspense>
    </div>
  );
}
