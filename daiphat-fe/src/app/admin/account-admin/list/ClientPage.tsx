"use client";

import { AdminListPage } from '@/admin/features/users/components/pages/AdminListPage';

import { createAdminClientPage } from '@/admin/lib/createAdminClientPage';
import { PERMISSIONS } from '@/admin/constants/permission.constants';

export const ClientPage = createAdminClientPage({
  component: AdminListPage,
  permission: PERMISSIONS.ACCOUNT.VIEW,
});
