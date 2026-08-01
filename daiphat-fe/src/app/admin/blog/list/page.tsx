"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogListPage = lazy(() => import('@/admin/features/blogs/components/pages/BlogListPage').then(m => ({ default: m.BlogListPage })));

export default function AdminBlogListRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.VIEW}>
      <BlogListPage />
    </PermissionGuard>
  );
}
