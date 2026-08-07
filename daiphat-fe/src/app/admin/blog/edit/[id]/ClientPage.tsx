"use client";

import { BlogEditPage } from '@/admin/features/blogs/components/pages/BlogEditPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: BlogEditPage,
  permission: PERMISSIONS.ARTICLE.EDIT,
});
