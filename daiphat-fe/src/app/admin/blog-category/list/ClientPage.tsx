"use client";

import { BlogCategoryListPage } from '@/admin/features/blogs/components/pages/BlogCategoryListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogCategoryListPage,
  permission: PERMISSIONS.ARTICLE.VIEW,
});
