"use client";

import { BlogCategoryEditPage } from '@/admin/features/blogs/components/pages/BlogCategoryEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogCategoryEditPage,
  permission: PERMISSIONS.ARTICLE.VIEW,
});
