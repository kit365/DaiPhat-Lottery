"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogTagListPage = lazy(() => import('@/admin/features/blogs/components/pages/BlogTagListPage').then(m => ({ default: m.BlogTagListPage })));

export default function AdminBlogTagListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}>
      <BlogTagListPage />
    </PermissionGuard>
  );
}
