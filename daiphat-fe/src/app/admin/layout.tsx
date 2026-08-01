"use client";

import { Suspense } from 'react';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen text-inherit font-inherit">
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </div>
  );
}
