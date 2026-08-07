"use client";

import { BlogListPage } from '@/admin/features/blogs/components/pages/BlogListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogListPage,
  permission: PERMISSIONS.ARTICLE.VIEW,
});
