"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogCategoryEditPage = lazy(() => import('@/admin/features/blogs/components/pages/BlogCategoryEditPage').then(m => ({ default: m.BlogCategoryEditPage })));

export default function AdminBlogCategoryDetailRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}>
      <BlogCategoryEditPage />
    </PermissionGuard>
  );
}
