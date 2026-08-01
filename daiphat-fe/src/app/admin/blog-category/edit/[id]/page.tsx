"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogCategoryEditPage = lazy(() => import('@/admin/features/blogs/components/pages/BlogCategoryEditPage').then(m => ({ default: m.BlogCategoryEditPage })));

export default function AdminBlogCategoryEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.EDIT}>
      <BlogCategoryEditPage />
    </PermissionGuard>
  );
}
