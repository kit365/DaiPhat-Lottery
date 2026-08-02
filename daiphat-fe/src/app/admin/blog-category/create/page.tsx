"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogCategoryCreatePage = lazy(() => import('@/admin/features/blogs/components/pages/BlogCategoryCreatePage').then(m => ({ default: m.BlogCategoryCreatePage })));

export default function AdminBlogCategoryCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.CREATE}>
      <BlogCategoryCreatePage />
    </PermissionGuard>
  );
}
