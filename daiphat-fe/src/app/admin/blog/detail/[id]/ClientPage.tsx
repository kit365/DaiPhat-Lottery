"use client";

import { BlogDetailPage } from '@/admin/features/blogs/components/pages/BlogDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogDetailPage,
  permission: PERMISSIONS.ARTICLE.VIEW,
});
