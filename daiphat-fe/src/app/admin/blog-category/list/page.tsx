"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogCategoryListPage = lazy(() => import('@/admin/features/blogs/components/pages/BlogCategoryListPage').then(m => ({ default: m.BlogCategoryListPage })));

export default function AdminBlogCategoryListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}>
      <BlogCategoryListPage />
    </PermissionGuard>
  );
}
