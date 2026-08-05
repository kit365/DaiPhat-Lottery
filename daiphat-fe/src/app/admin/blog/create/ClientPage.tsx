"use client";

import { BlogCreatePage } from '@/admin/features/blogs/components/pages/BlogCreatePage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogCreatePage,
  permission: PERMISSIONS.ARTICLE.CREATE,
});
