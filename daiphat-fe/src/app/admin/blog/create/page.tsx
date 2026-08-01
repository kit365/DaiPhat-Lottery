"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogCreatePage = lazy(() => import('@/admin/features/blogs/components/pages/BlogCreatePage').then(m => ({ default: m.BlogCreatePage })));

export default function AdminBlogCreateRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.CREATE}>
      <BlogCreatePage />
    </PermissionGuard>
  );
}
