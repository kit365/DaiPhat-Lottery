"use client";

import dynamic from 'next/dynamic';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';
import { LoadingSpinner } from '@/client/components/ui/LoadingSpinner';

const FeaturePage = dynamic(
  () => import('@/admin/features/blogs/components/pages/BlogCategoryEditPage').then((m) => m.BlogCategoryEditPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <LoadingSpinner />
      </div>
    ),
  }
);

export function ClientPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}>
      <FeaturePage />
    </PermissionGuard>
  );
}
