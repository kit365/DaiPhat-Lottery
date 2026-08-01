"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogDetailPage = lazy(() => import('@/admin/features/blogs/components/pages/BlogDetailPage').then(m => ({ default: m.BlogDetailPage })));

export default function AdminBlogDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}>
      <BlogDetailPage />
    </PermissionGuard>
  );
}
