"use client";

import { BlogTagListPage } from '@/admin/features/blogs/components/pages/BlogTagListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogTagListPage,
  permission: PERMISSIONS.ARTICLE.VIEW,
});
