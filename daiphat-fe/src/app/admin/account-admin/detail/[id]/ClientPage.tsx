"use client";

import { AdminDetailPage } from '@/admin/features/users/components/pages/AdminDetailPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AdminDetailPage,
  permission: PERMISSIONS.ACCOUNT.VIEW,
});
