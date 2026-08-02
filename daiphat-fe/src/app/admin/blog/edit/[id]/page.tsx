"use client";

import React, { lazy } from 'react';
import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

const BlogEditPage = lazy(() => import('@/admin/features/blogs/components/pages/BlogEditPage').then(m => ({ default: m.BlogEditPage })));

export default function AdminBlogEditRoute() {
  return (
    <PermissionGuard permission={PERMISSIONS.ARTICLE.EDIT}>
      <BlogEditPage />
    </PermissionGuard>
  );
}
