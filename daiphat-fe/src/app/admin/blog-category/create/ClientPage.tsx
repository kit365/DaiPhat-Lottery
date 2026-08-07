"use client";

import { BlogCategoryCreatePage } from '@/admin/features/blogs/components/pages/BlogCategoryCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogCategoryCreatePage,
  permission: PERMISSIONS.ARTICLE.CREATE,
});
